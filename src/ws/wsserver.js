import WebSocket, { WebSocketServer } from "ws";
import authenticateWS from "./uitils/index.js";
import publisherClient from "../../redis/publisher.js";
import consumerClient from "../../redis/consumer.js";

let wss = null;
const room = new Map();
const clientRoomMap = new Map();

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
  await publisherClient.publish(
    `room-${roomId}`,
    JSON.stringify({
      event_type: "SEND_MESSAGE",
      data: {
        user: ws.user,
        message: payload.message,
      },
    }),
  );
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

        case "SEND_MESSAGE":
          sendMessage(payload.data, ws, wss);
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
  }, 30 * 1000);

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
