# TxLens

Two Web3 safety tools in one TypeScript full-stack app:

1. **Transaction explainer** — paste a tx hash, get the raw on-chain data plus a plain-language explanation.
2. **Approval scanner** — connect (or paste) an address, see every ERC-20 approval, its risk level, and revoke what you no longer need.

**[Live app](https://txlens-opal.vercel.app)** · **[API](https://txlens-api.onrender.com/health)**

![Wallet approvals](./docs/wallet.png)

---

## Why

Block explorers show raw data: hex addresses, gas numbers, undecoded input. Most people cannot tell what a transaction did — or which contract can still drain their wallet.

TxLens answers two questions:

- *What did this transaction actually do?*
- *Which contracts can still spend my tokens, and how dangerous is that?*

---

## Features

### /tx — AI transaction explainer

- Fetches transaction + receipt over RPC with **viem**
- Shows from / to / value / nonce / status / gas used
- LLM turns the payload into a plain-language summary with risk hints
- One-click example transaction for quick testing

### /wallet — approval scanner

- Scans four high-liquidity tokens (USDC, USDT, DAI, WETH) on Ethereum mainnet
- Reconciles historical `Approval` events with the **current** `allowance()` — history alone would be wrong
- Risk levels: unlimited + unknown spender → **HIGH**, non-unlimited unknown → **MEDIUM**, known protocol → **LOW**
- Revoke flow: `approve(spender, 0)` with `signing → pending → confirmed / failed` states
- Read-only scan for any address; connect a wallet only to revoke

---

## Architecture

```
Browser
  │
  ├── Vercel (Next.js 16, App Router)
  │      /tx      AI explainer
  │      /wallet  approval scanner
  │
  └── Render (Fastify + BullMQ worker)
         │
         ├── Neon Postgres   scans / approvals / revokes
         ├── Upstash Redis   cache + job queue
         └── Etherscan v2 + public RPC   approval logs, allowance()
```

### Scan flow

```
POST /api/scans/async { owner }
   → job queued, 202 + jobId
   → worker: Approval logs → allowance() per spender → risk score
   → transaction: 1 scan row + N approval rows
   → cache for this owner invalidated

GET /api/jobs/:id     → waiting | active | completed | failed
GET /api/scans?owner= → cached for 60s, falls back to Postgres
```

**Why a queue:** a scan hits Etherscan plus N RPC calls and takes seconds; doing it inline would block the request and time out. The API returns immediately and the worker owns the slow path, with 3 retries and exponential backoff.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind, daisyUI |
| Chain access | viem, wagmi, RainbowKit |
| Backend | Fastify 5, zod |
| Data | PostgreSQL (Neon), Redis (Upstash) |
| Async | BullMQ worker, retries + backoff |
| LLM | DeepSeek (OpenAI-compatible) |
| Deploy | Vercel (web) · Render (API) |

---

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness + Postgres + Redis status |
| POST | `/api/scans` | sync write (one scan + approvals, in a transaction) |
| POST | `/api/scans/async` | enqueue a scan, returns `jobId` |
| GET | `/api/scans?owner=` | scan history with nested approvals |
| GET | `/api/jobs/:id` | job state + result |
| POST | `/api/revokes` | record a revoke attempt (`pending/confirmed/failed`) |

---

## Run locally

```bash
git clone https://github.com/yah15660532032-wq/txlens.git
cd txlens
yarn install
```

### 1. Database and Redis

```bash
cd packages/server
docker compose up -d          # Postgres 16 + Redis 7
psql -U postgres -d wallet_safety -f migrations/001_init.sql
```

(No Docker? Use any Postgres 14+ and run the same SQL file.)

### 2. Backend

`packages/server/.env`:

```env
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/wallet_safety
REDIS_URL=redis://localhost:6379
ETHERSCAN_API_KEY=your_key
# only needed on networks that cannot reach api.etherscan.io directly
# HTTPS_PROXY=http://127.0.0.1:7890
```

```bash
yarn workspace @se-2/server dev
```

### 3. Frontend

`packages/nextjs/.env.local`:

```env
LLM_API_KEY=your_key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
yarn start
```

Open http://localhost:3000/wallet

---

## Project structure

```
packages/
  nextjs/
    app/tx/page.tsx            # AI explainer
    app/wallet/page.tsx        # approval scanner + revoke
    app/api/explain/route.ts   # LLM proxy (key stays server-side)
    utils/api.ts               # typed client for the Fastify API
  server/
    src/index.ts               # routes, validation, health
    src/scan.ts                # scanOwner(): logs → allowance → risk
    src/etherscan.ts           # Approval logs (topic0/topic1)
    src/queue.ts               # BullMQ queue
    src/worker.ts              # consumes jobs, writes, invalidates cache
    src/repos/scans.ts         # SQL: transactions + join/aggregate
    migrations/001_init.sql
  hardhat/                     # Scaffold-ETH template (unused)
```

---

## Design decisions and trade-offs

**Separate backend instead of Next API routes.** Serverless functions cannot host a long-lived worker, and the scan needs one. Splitting also lets the frontend and API deploy independently.

**Events are candidates, `allowance()` is the truth.** An `Approval` event proves a spender was *ever* approved; it does not mean the allowance is still live. Every candidate is re-checked on-chain and zero allowances are dropped.

**Approvals are written in a transaction.** One scan plus N approvals either commits fully or rolls back — no half-written scans.

**Cache is write-through invalidated, with a TTL.** A revoke must not leave the UI showing a stale HIGH. Deleting on write handles the common case; the 60s TTL bounds the damage if the delete fails or another instance writes.

**Big integers travel as strings.** `uint256` allowances exceed `Number.MAX_SAFE_INTEGER`, and Postgres `numeric` becomes an imprecise JSON number. The SQL casts to `text`; the client parses with `BigInt`.

**Redis failures degrade, they do not crash.** Cache reads/writes are best-effort. `/health` reports `redis: down` and returns 503 so monitoring notices, but user requests keep working against Postgres.

**Revokes are recorded, not trusted.** The chain receipt is the source of truth; the `revokes` table is an audit trail of attempts (`pending`, `confirmed`, `failed`).

---

## Known limitations

- Ethereum mainnet only; tokens are a hard-coded whitelist
- No idempotency key yet — a duplicate job would write a duplicate scan
- Scan is serial per token; batch `allowance()` reads via Multicall3 would be much faster
- Render's free instance sleeps after inactivity (first request is slow)
- No queue-depth monitoring or dead-letter queue yet

## Roadmap

- [ ] Multicall3 batching and a per-owner cache for Etherscan results
- [ ] Idempotency key on scan jobs
- [ ] Multi-chain (Base, Arbitrum) and full token discovery
- [ ] SSE job progress instead of polling

---

## License

MIT
