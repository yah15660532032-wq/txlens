import { Worker } from "bullmq";
import { redisConnection, type ScanJobData } from "./queue.js";
import { redis } from "./redis.js";
import { createScan } from "./repos/scans.js";
import { scanOwner } from "./scan.js";

export function startWorker(): Worker<ScanJobData> {
  const worker = new Worker<ScanJobData>(
    "scan",
    async (job) => {
      const { owner, chainId } = job.data;

      const { approvals, riskScore } = await scanOwner(owner, chainId);
      const scanId = await createScan(owner, chainId, riskScore, approvals);

      // The list cache is keyed by owner; drop it after a background write
      await redis.del(`scans:${owner.toLowerCase()}`).catch(() => undefined);

      return { scanId, approvalCount: approvals.length };
    },
    {
      connection: redisConnection,
      concurrency: 2,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[worker] job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[worker] job ${job?.id} failed:`, error.message);
  });

  return worker;
}
