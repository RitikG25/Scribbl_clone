import Redis from "ioredis";
const publisherClient = new Redis({
  port: "6379",
  host: "localhost",
});

export default publisherClient;
