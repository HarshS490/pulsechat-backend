import express, { Application, Request, Response } from "express";
import { configDotenv } from "dotenv"; "dotenv/config";
import cors from "cors";
import router from "./routes/routes.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { setUpSocketService } from "./socket.js";
import { startMessageConsumer } from "./config/kafka.js";
configDotenv();

const app: Application = express();
const PORT = process.env.PORT || 7000;
startMessageConsumer();


const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

setUpSocketService(io);

// * Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api", router);

app.get("/", (req: Request, res: Response) => {
  return res.send("It's working");
});

server.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
