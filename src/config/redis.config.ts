import {Redis} from "ioredis"

const url = process.env.IO_REDIS_URL as string;

const redisClient = new Redis(url);

export default redisClient;