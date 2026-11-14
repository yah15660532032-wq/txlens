# @se-2/server

Node.js + TypeScript + Fastify backend for Wallet Safety.

## Run

```bash
# from repo root
yarn install
yarn workspace @se-2/server dev
```

Server listens on `http://localhost:3001`.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | liveness probe |
| GET | `/api/approvals?owner=&token=` | approval lookup (stub until week 2) |

## Response shape

```json
{ "data": {}, "error": null }
```

Errors return a non-null `error` and a proper status code.

## Next steps

- week 2: Postgres (scans / approvals tables)
- week 3: Redis cache + BullMQ queue
- week 4: Docker + deploy + structured logs
