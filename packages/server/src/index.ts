import "dotenv/config";
import Fastify from "fastify";
import { z } from "zod";
import { closeDb, pingDb } from "./db.js";
import { createScan, listScans } from "./repos/scans.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
  },
});

// ---------- schemas ----------

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed address");

const approvalsQuery = z.object({
  owner: address,
  token: address,
});

const riskLevel = z.enum(["high", "medium", "low"]);

const createScanBody = z.object({
  owner: address,
  chainId: z.number().int().positive().default(1),
  riskScore: z.number().int().min(0).max(100).default(0),
  approvals: z
    .array(
      z.object({
        tokenAddress: address,
        tokenSymbol: z.string().min(1).max(16),
        spenderAddress: address,
        allowanceRaw: z.string().regex(/^\d+$/, "must be a decimal string"),
        isUnlimited: z.boolean().default(false),
        riskLevel: riskLevel.default("low"),
      }),
    )
    .default([]),
});

const listScansQuery = z.object({
  owner: address,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------- routes ----------

app.get("/health", async (_request, reply) => {
  const dbUp = await pingDb();
  return reply.code(dbUp ? 200 : 503).send({
    status: dbUp ? "ok" : "degraded",
    db: dbUp ? "up" : "down",
    uptime: process.uptime(),
  });
});

app.get("/api/approvals", async (request, reply) => {
  const parsed = approvalsQuery.safeParse(request.query);

  if (!parsed.success) {
    return reply.code(400).send({
      data: null,
      error: "invalid query",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  // TODO (week 2+): fetch Approval logs and reconcile with allowance()
  return reply.send({
    data: { owner: parsed.data.owner, token: parsed.data.token, spenders: [] },
    error: null,
  });
});

app.post("/api/scans", async (request, reply) => {
  const parsed = createScanBody.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      data: null,
      error: "invalid body",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { owner, chainId, riskScore, approvals } = parsed.data;

  try {
    const scanId = await createScan(owner, chainId, riskScore, approvals);
    return reply.code(201).send({ data: { id: scanId }, error: null });
  } catch (error) {
    request.log.error({ err: error }, "createScan failed");
    return reply.code(500).send({ data: null, error: "failed to store scan" });
  }
});

app.get("/api/scans", async (request, reply) => {
  const parsed = listScansQuery.safeParse(request.query);

  if (!parsed.success) {
    return reply.code(400).send({
      data: null,
      error: "invalid query",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const scans = await listScans(parsed.data.owner, parsed.data.limit);
    return reply.send({ data: scans, error: null });
  } catch (error) {
    request.log.error({ err: error }, "listScans failed");
    return reply.code(500).send({ data: null, error: "failed to read scans" });
  }
});

// ---------- lifecycle ----------
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

async function start() {
  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();
    await closeDb();
    process.exit(0);
  });
}

void start();
