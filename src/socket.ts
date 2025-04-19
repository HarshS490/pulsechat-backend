import { Server, Socket } from "socket.io";
import { prisma } from "./config/prisma.js";
import { produceMessage } from "./config/kafka.js";
import { Redis } from "ioredis";

interface CustomSocket extends Socket {
  room?: string;
}

export enum Events {
  MESSAGE = "MESSAGE",
  CONNECT = "CONNECT",
  DISCONNECT = "disconnect",
  ERROR = "ERROR",
}

export type SocketMessageType = {
  body: string | null;
  chatId: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  public_id: string | null;
  isEdited: boolean | null;
  createdBy: {
    id: string;
    image: string | null;
    name: string;
    email: string;
  };
};

let socketServiceInstance: SocketService | null = null;

export function setUpSocketService(io: Server) {
  if (socketServiceInstance) return;
  const _socketServiceInstance = new SocketService(io);
  socketServiceInstance = _socketServiceInstance;
}

export class SocketService {
  private _io: Server;
  private redisClient: Redis;
  private redisSubscriber: Redis;

  constructor(io: Server) {
    this._io = io;
    const url = process.env.IO_REDIS_URL as string;
    this.redisClient = new Redis(url);
    this.redisSubscriber = new Redis(url);
    this.setUpSubscriber();
    this.setUpMiddleware();
    this.setUpHandlers();
  }

  private setUpMiddleware() {
    this._io.use((socket: CustomSocket, next) => {
      const room = socket.handshake.auth.room || socket.handshake.headers.room;
      if (!room) {
        return next(new Error("Invalid Room"));
      }
      socket.room = room;
      next();
    });
  }

  //subscriber setup
  private setUpSubscriber() {
    this.redisSubscriber.subscribe("chat-message", (err, count) => {
      if (err) {
        console.log("Failed to subscribe to redis channel: ", err);
      } else {
        console.log(
          `Subscribed to Redis Channel : chat-message (count:${count})`
        );
      }
    });

    this.redisSubscriber.on(
      "message",
      async (channel: string, message: string) => {
        if (channel === "chat-message") {
          const { roomId, data } = JSON.parse(message);
          this._io.to(roomId).emit(Events.MESSAGE, data);
          await produceMessage(JSON.stringify(data));
          console.log("message produced to kafka Broker");
        }
      }
    );
  }

  // publish a message to Redis
  public publishMessage(roomId: string, message: any) {
    const msgData = {
      roomId,
      data: message,
    };
    this.redisClient.publish("chat-message", JSON.stringify(msgData));
    console.log("published message to redis");
  }

  private setUpHandlers() {
    this._io.on("connection", (socket: CustomSocket) => {
      // join the room
      console.log("a socket connected : ", socket.id);
      socket.join(socket.room!);

      socket.on(Events.MESSAGE, async (data: SocketMessageType) => {
        try {
          const message = data;

          this.publishMessage(socket.room!, message);
        } catch (error) {
          console.log(error);
        }
      });
      socket.on(Events.DISCONNECT, () => {
        console.log("a user disconnected : ", socket.id);
      });
    });
  }
}
