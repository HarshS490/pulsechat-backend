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
  JOIN = "JOIN",
  LEAVE = "LEAVE",
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
          console.log("Trying to emit to room", roomId, "with sockets:", this._io.sockets.adapter.rooms.get(roomId));
          this._io.to(roomId).emit(Events.MESSAGE, data);
          console.log("message emitted to users in room : ",roomId);
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

      socket.on(Events.JOIN, async (data) => {
        if (!data.room) {
          console.log("Room id not provided");
          throw new Error("Room id not provided");
        }
        socket.join(data.room);
      });

      // socket.on(Events.LEAVE, async (data) => {
      //   if (!data.room) {
      //     console.log("room id not provided");
      //     return;
      //   }
      //   socket.leave(data.room);
      // });

      socket.on(Events.JOIN, async (data, callback) => {
        if (!data.room) return callback?.(new Error("Room not provided"));
        socket.join(data.room);
        console.log(`${socket.id} joined room ${data.room}`);
        callback?.(); // Notify client that room join is complete
      });

      socket.on(
        Events.MESSAGE,
        async (data: { message: SocketMessageType; room: string }) => {
          try {
            console.log(data);
            const { message, room } = data;

            this.publishMessage(room, message);
          } catch (error) {
            console.log(error);
          }
        }
      );

      socket.on(Events.DISCONNECT, () => {
        console.log("a user disconnected : ", socket.id);
      });
    });
  }
}
