import http from "http";
import app from "./app.js";
import WSServer from "./ws/wsserver.js";

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  WSServer(server);
  console.log(`Server is running on port ${PORT}`);
});
