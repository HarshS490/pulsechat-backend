import express, { Application, Request, Response } from "express";
import "dotenv/config";
import cors from "cors";
import router from "./routes/routes.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { setupSocket } from "./socket.js";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import redisClient from "./config/redis.config.js";

const app: Application = express();
const PORT = process.env.PORT || 7000;

const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
  adapter: createAdapter(redisClient),
});

setupSocket(io);

// * Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api", router);

app.get("/", (req: Request, res: Response) => {
  return res.send("It's working");
});

server.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
