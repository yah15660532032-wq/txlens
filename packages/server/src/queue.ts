import "dotenv/config";
import { Queue } from "bullmq";

const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");

export const redisConnection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  password: url.password || undefined,
  username: url.username || undefined,
  maxRetriesPerRequest: null as null,
};

export type ScanJobData = {
  owner: string;
  chainId: number;
};

export const scanQueue = new Queue<ScanJobData>("scan", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});
