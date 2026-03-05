import Redis from "ioredis";
const consumerClient = new Redis({
  port: 6379,
  host: "localhost",
});

export default consumerClient;
