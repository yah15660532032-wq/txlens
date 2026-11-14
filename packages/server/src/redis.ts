import "dotenv/config";
import { Redis } from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(url, {
  maxRetriesPerRequest: 2,
  lazyConnect: false,
});

redis.on("error", (error: Error) => {
  // Do not crash the process when Redis is temporarily unavailable
  console.error("[redis] error:", error.message);
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
