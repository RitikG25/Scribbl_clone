import WebSocket, { WebSocketServer } from "ws";
import authenticateWS from "./uitils/index.js";
import publisherClient from "../../redis/publisher.js";
import consumerClient from "../../redis/consumer.js";

let wss = null;
const room = new Map();
const clientRoomMap = new Map();
const HEARTBEAT_INTERVAL = 30 * 1000;
const gameState = new Map();
const pendingWordSelections = new Map();

function onSocketError(err) {
  console.error(err);
}

async function joinRoom(payload, ws, wss) {
  const roomId = payload.roomId;
  if (!roomId) return;
  if (room.has(roomId)) {
    room.get(roomId).add(ws);
    if (!clientRoomMap.has(ws)) {
      clientRoomMap.set(ws, new Set([roomId]));
    } else {
      clientRoomMap.get(ws).add(roomId);
    }
  } else {
    room.set(roomId, new Set([ws]));
    clientRoomMap.set(ws, new Set([roomId]));
    await consumerClient.subscribe(`room-${roomId}`);
  }
  await publisherClient.publish(
    `room-${roomId}`,
    JSON.stringify({
      event_type: "USER_JOINED",
      data: {
        user: ws.user,
        message: `User ${ws.user.name} has joined the room`,
      },
    }),
  );
}

async function endGameAndShowResults(roomId) {
  const state = gameState.get(`room-${roomId}`);
  state.status = "ENDED";
  if (!state) return;
  // ✅ For demo purposes, we just show the word to draw for each round
  const results = state.rounds.map((round, index) => ({
    round: index + 1,
    wordToDraw: round.wordToDraw,
    drawer: round.drawer,
    guessers: Array.from(round.guessers).sort((a, b) => b.points - a.points),
  }));

  await publisherClient.publish(
    `room-${roomId}`,
    JSON.stringify({
      event_type: "GAME_RESULTS",
      data: {
        results: results,
        message: `Game has ended! Here are the results.`,
      },
    }),
  );
}

async function endRound(roomId) {
  const state = gameState.get(`room-${roomId}`);
  if (!state) return;
  state.rounds[state.current_round - 1].status = "ENDED";

  if (state.current_round < state.max_rounds) {
    state.current_round++;
    state.rounds.push({
      guessingWords: ["apple", "banana", "orange", "grape", "watermelon"],
      drawer: null,
      wordToDraw: null,
      guessers: new Set(),
      status: "NOT_STARTED",
    });
    startRound(roomId);
  } else {
    await publisherClient.publish(
      `room-${roomId}`,
      JSON.stringify({
        event_type: "GAME_ENDED",
        data: {
          message: `Game has ended!`,
        },
      }),
    );

    endGameAndShowResults(roomId);
  }
}

async function selectDrawer(roomId) {
  const state = gameState.get(`room-${roomId}`);
  if (!state) return;
  const clients = room.get(roomId);
  const drawer = Array.from(clients)[Math.floor(Math.random() * clients.size)];
  state.rounds[state.current_round - 1].drawer = drawer.user;
  state.rounds[state.current_round - 1].status = "DRAWER_SELECTED";

  await publisherClient.publish(
    `room-${roomId}`,
    JSON.stringify({
      event_type: "DRAWER_SELECTED",
      data: {
        drawer: drawer.user,
        message: `User ${drawer.user.name} is selected as the drawer for round ${state.current_round}`,
      },
    }),
  );
}

async function getWordSelection(payload, ws, wss) {
  const roomId = payload.roomId;
  const selectedWord = payload.selectedWord;
  if (!roomId || !selectedWord) return;

  const state = gameState.get(`room-${roomId}`);
  if (!state) return;

  const key = `room-${roomId}-round-${state.current_round}`;
  const pending = pendingWordSelections.get(key);

  if (pending?.resolve) {
    // ✅ Selection arrived in time
    pending.resolve({ timedOut: false, selection: selectedWord });
  } else {
    // ✅ Too late or no pending selection
    ws.send(
      JSON.stringify({
        event_type: "TOO_LATE",
        message: "Word selection window has closed.",
      }),
    );
  }
}

async function waitForSelectedWord(key, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pendingWordSelections.has(key)) {
        pendingWordSelections.delete(key);
        resolve({ timedOut: true, selection: null });
      }
    }, timeoutMs);

    // ✅ Only set once, with the real resolver
    pendingWordSelections.set(key, {
      resolve: (data) => {
        clearTimeout(timer);
        pendingWordSelections.delete(key);
        resolve(data);
      },
    });
  });
}

async function selectWordToDraw(roomId) {
  const state = gameState.get(`room-${roomId}`);
  if (!state) return;
  const currentRound = state.rounds[state.current_round - 1];
  currentRound.status = "WORD_SELECTION";
  await publisherClient.publish(
    `room-${roomId}`,
    JSON.stringify({
      event_type: "WORD_SELECTION",
      data: {
        drawer: currentRound.drawer,
        message: `Drawer ${currentRound.drawer.name} is selecting a word to draw for round ${state.current_round}`,
      },
    }),
  );

  room.get(roomId).forEach((client) => {
    if (
      client.user.id === currentRound.drawer.id &&
      client.readyState === WebSocket.OPEN
    ) {
      client.send(
        JSON.stringify({
          event_type: "SELECT_WORD_TO_DRAW",
          data: {
            words: currentRound.guessingWords,
            message: `Please select a word to draw for round ${state.current_round}...you have 15 seconds!`,
          },
        }),
      );
    }
  });

  const key = `room-${roomId}-round-${state.current_round}`;
  pendingWordSelections.set(key, { resolve: null, selection: null });
  const { timedOut, selection } = await waitForSelectedWord(key, 30 * 1000);
  if (timedOut) {
    const randomWord =
      currentRound.guessingWords[
        Math.floor(Math.random() * currentRound.guessingWords.length)
      ];
    currentRound.wordToDraw = randomWord;
    console.log(`Timed out — random word selected: ${randomWord}`);
  } else {
    currentRound.wordToDraw = selection;
    console.log(`Word selected: ${selection}`);
  }
}

async function startRound(roomId) {
  const state = gameState.get(`room-${roomId}`);
  if (!state) return;

  state.rounds[state.current_round - 1].status = "IN_PROGRESS";
  state.status = "ROUND_IN_PROGRESS";

  await publisherClient.publish(
    `room-${roomId}`,
    JSON.stringify({
      event_type: "ROUND_STARTING",
      data: {
        round: state.current_round,
        message: `Round ${state.current_round} is starting...`,
      },
    }),
  );
  let timer = null;
  try {
    await selectDrawer(roomId);
    await selectWordToDraw(roomId);

    state.rounds[state.current_round - 1].status = "ON_GOING";
    state.rounds[state.current_round - 1].started_at = Date.now();
    await publisherClient.publish(
      `room-${roomId}`,
      JSON.stringify({
        event_type: "ROUND_STARTED",
        data: {
          round: state.current_round,
          message: `Round ${state.current_round} has started! you have 60 seconds to guess the word! The word has ${state.rounds[state.current_round - 1].wordToDraw.length} letters.`,
          guessingWords: state.rounds[state.current_round - 1].guessingWords,
        },
      }),
    );
    timer = setTimeout(async () => {
      state.rounds[state.current_round - 1].ended_at = Date.now();
      await publisherClient.publish(
        `room-${roomId}`,
        JSON.stringify({
          event_type: "ROUND_ENDED",
          data: {
            round: state.current_round,
            message: `Round ${state.current_round} has ended!`,
          },
        }),
      );

      endRound(roomId);
    }, 60 * 1000);
  } catch (error) {
    console.error(error);
  }
}

async function gameStart(payload, ws, wss) {
  const roomId = payload.roomId;
  if (!roomId) return;
  await publisherClient.publish(
    `room-${roomId}`,
    JSON.stringify({
      event_type: "START_GAME",
      data: {
        user: ws.user,
        message: `Game is starting...`,
      },
    }),
  );

  gameState.set(`room-${roomId}`, {
    max_rounds: 10,
    current_round: 1,
    status: "STARTED",
    rounds: [
      {
        guessingWords: ["apple", "banana", "orange", "grape", "watermelon"],
        drawer: null,
        wordToDraw: null,
        guessers: new Set(),
        status: "NOT_STARTED",
        started_at: null,
        ended_at: null,
      },
    ],
  });

  startRound(roomId);
}

async function leaveRoom(payload, ws, wss) {
  const roomId = payload.roomId;
  if (!roomId) return;
  if (room.has(roomId)) {
    room.get(roomId).delete(ws);
    if (clientRoomMap.has(ws)) {
      clientRoomMap.get(ws).delete(roomId);
    }
    if (clientRoomMap.get(ws).size === 0) {
      clientRoomMap.delete(ws);
    }
    if (room.get(roomId).size === 0) {
      room.delete(roomId);
      await consumerClient.unsubscribe(`room-${roomId}`);
      return;
    }

    await publisherClient.publish(
      `room-${roomId}`,
      JSON.stringify({
        event_type: "USER_LEFT",
        data: {
          user: ws.user,
          message: `User ${ws.user.name} has left the room`,
        },
      }),
    );
  }
}

async function sendMessage(payload, ws, wss) {
  const roomId = payload.roomId;
  if (!roomId) return;
  const state = gameState.get(`room-${roomId}`);
  // if the game has not yet started or the round is not in progress, we treat all messages as system messages (no guessing)
  if (
    !state ||
    state.status !== "ROUND_IN_PROGRESS" ||
    state.rounds[state.current_round - 1].status !== "ON_GOING"
  ) {
    await publisherClient.publish(
      `room-${roomId}`,
      JSON.stringify({
        event_type: "SEND_MESSAGE",
        data: {
          user: ws.user,
          message: payload.message,
          type: "SYSTEM_MESSAGE",
        },
      }),
    );
  } else if (
    state.rounds[state.current_round - 1].wordToDraw.toLowerCase() ===
    payload.message.toString().toLowerCase()
  ) {
    if (state.rounds[state.current_round - 1].drawer.id === ws.user.id) {
      ws.send(
        JSON.stringify({
          event_type: "INVALID_GUESS",
          data: {
            user: ws.user,
            message: `You are the drawer! You cannot guess the word.`,
          },
        }),
      );
      return;
    }

    const startTime = state.rounds[state.current_round - 1].started_at;
    const guessedAt = payload.guessed_at || Date.now();
    const timeTaken = guessedAt - startTime;
    const basePoints = 1000;
    const points = Math.max(10, Math.floor((basePoints - timeTaken) * 10));
    // check if gueser has already guessed the word correctly
    const alreadyGuessed = Array.from(
      state.rounds[state.current_round - 1].guessers,
    ).some((guesser) => guesser.id === ws.user.id);

    if (alreadyGuessed) {
      ws.send(
        JSON.stringify({
          event_type: "ALREADY_GUESSED",
          data: {
            user: ws.user,
            message: `You have already guessed the word correctly!`,
          },
        }),
      );
      return;
    }

    state.rounds[state.current_round - 1].guessers.add({
      user: ws.user,
      points: points,
      guessedAt: guessedAt,
      id: ws.user.id,
    });
    await publisherClient.publish(
      `room-${roomId}`,
      JSON.stringify({
        event_type: "CORRECT_GUESS",
        data: {
          user: ws.user,
          message: `User ${ws.user.name} guessed the word correctly!".`,
        },
      }),
    );
  } else {
    await publisherClient.publish(
      `room-${roomId}`,
      JSON.stringify({
        event_type: "INCORRECT_GUESS",
        data: {
          user: ws.user,
          message: payload.message,
        },
      }),
    );
  }
}

async function leaveJoinedRooms(ws) {
  const rooms = clientRoomMap.get(ws);
  if (!rooms) return;

  for (const roomId of rooms) {
    if (!room.has(roomId)) continue;

    room.get(roomId).delete(ws);

    if (room.get(roomId).size === 0) {
      room.delete(roomId);
      await consumerClient.unsubscribe(`room-${roomId}`);
    } else {
      await publisherClient.publish(
        `room-${roomId}`,
        JSON.stringify({
          event_type: "USER_LEFT",
          data: {
            user: ws.user,
            message: `User ${ws.user.name} has left the room`,
          },
        }),
      );
    }
  }

  clientRoomMap.delete(ws);
}

async function WSServer(server) {
  wss = new WebSocketServer({ noServer: true });

  consumerClient.on("message", (channel, message) => {
    const roomId = +channel.split("-")[1];
    const payload = JSON.parse(message);
    if (room.has(roomId)) {
      room.get(roomId).forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  wss.on("connection", (ws, request, user) => {
    console.log("New client connected");
    ws.user = user;
    ws.isAlive = true;

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`User ${user.name} has joined the chat`);
      }
    });

    ws.on("message", (data) => {
      console.log(data.toString(), JSON.parse(data.toString()));
      const payload = JSON.parse(data.toString());
      switch (payload.event_type) {
        case "JOIN_ROOM":
          joinRoom(payload.data, ws, wss);
          break;
        case "LEAVE_ROOM":
          leaveRoom(payload.data, ws, wss);
          break;

        case "START_GAME":
          gameStart(payload.data, ws, wss);
          break;

        case "SEND_MESSAGE":
          sendMessage(payload.data, ws, wss);
          break;
        case "SELECT_WORD_TO_DRAW":
          getWordSelection(payload.data, ws, wss);
          break;
        default:
          break;
      }
    });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      leaveJoinedRooms(ws);
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      if (!client.isAlive) {
        client.terminate();
      }

      client.isAlive = false;
      client.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => {
    console.log("wss server closed");
    clearInterval(interval);
  });

  server.on("upgrade", async function upgrade(request, socket, head) {
    socket.on("error", onSocketError);

    try {
      const user = await authenticateWS(request);
      socket.removeListener("error", onSocketError);
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit("connection", ws, request, user);
      });
    } catch (err) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });
}

export default WSServer;
