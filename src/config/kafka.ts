import { Kafka, Producer } from "kafkajs";
import fs from "fs";
import path from "path";
import { prisma } from "./prisma.js";
import { SocketMessageType } from "../socket.js";

const kafka = new Kafka({
  brokers: [process.env.AIVEN_KAFKA_HOST!],
  ssl: {
    ca: [fs.readFileSync(path.resolve("./ca.pem"), "utf-8")],
  },
  sasl: {
    username: process.env.AIVEN_KAFKA_USERNAME!,
    password: process.env.AIVEN_KAFKA_PASSWORD!,
    mechanism: "plain",
  },
});

export default kafka;

let producer: null | Producer = null;

export async function createProducer() {
  if (producer) return producer;
  const _producer = kafka.producer();
  await _producer.connect();
  producer = _producer;
  return producer;
}

export async function produceMessage(message: string) {
  const producer = await createProducer();
  producer.send({
    messages: [{ key: `message-${Date.now()}`, value: message }],
    topic: "MESSAGES",
  });
  return true;
}

export async function startMessageConsumer() {
  console.log("Consumer is running ." );
  const consumer = kafka.consumer({ groupId: "default" });
  await consumer.connect();
  await consumer.subscribe({ topic: "MESSAGES" , fromBeginning:true});

  await consumer.run({
    autoCommit: true,
    eachMessage: async ({ message, pause }) => {
      console.log("New message recieved");
      if (!message.value) return;
      const stringData = message.value.toString('utf-8');
      const data = JSON.parse(stringData) as SocketMessageType;
      console.log(data);
      try {
        const newMessage = await prisma.message.create({
          data: {
            body: data.body,
            Conversation: {
              connect: {
                id: data.chatId,
              },
            },
            createdBy: {
              connect: {
                id: data.createdBy,
              },
            },
            createdAt: data.createdAt,
          },
          include: {
            createdBy: {
              select: {
                name: true,
                id: true,
                email: true,
                image: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });
        
      } catch (error) {
        console.log("Can't Consume Message from kafka.");
        pause();
        setTimeout(() => {
          consumer.resume([{ topic: "MESSAGES" }]);
        }, 60 * 1000);
      }
    },
  });
}
