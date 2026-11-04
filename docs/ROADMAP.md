# TxLens Roadmap

Understand any Ethereum transaction — and the approvals your wallet has granted.

## Scope

| Item | Content |
| --- | --- |
| Product | TxLens — explain transactions, inspect approvals, revoke them |
| Form | Next.js web app (browser extension later) |
| Users | DeFi users, projects, wallets |
| Existing | `/tx` transaction explainer (done) |
| New | `/wallet` approval scan + risk + revoke |
| Timeline | V0: 2–3 weeks at ~2h/day |

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS + daisyUI
- wagmi + viem + RainbowKit
- LLM: DeepSeek (OpenAI-compatible)
- Data: Etherscan API (logs), Postgres (V0.5)
- Deploy: Vercel

## Routes

```
/                 → redirect /tx
/tx               → transaction explainer (existing)
/wallet           → approval list + risk + revoke (new)
/api/explain      → LLM explains a transaction (existing)
/api/approvals    → fetch approval logs (new)
/api/scan         → scan and persist (V0.5)
```

---

## V0 — must ship

### A. Basics
- [ ] `/wallet` page + nav entry
- [ ] Connect wallet (RainbowKit), show address
- [ ] Empty state when not connected
- [ ] Wrong-network prompt

### B. Approval scan
- [ ] Whitelist of 6 tokens (USDC / USDT / DAI / WETH / LINK / UNI)
- [ ] Fetch `Approval` logs from Etherscan filtered by owner
- [ ] Aggregate by spender, keep latest amount
- [ ] Re-check current state with `allowance()`
- [ ] Filter out zero allowances
- [ ] Loading / empty / error states

### C. Risk
- [ ] Unlimited approval detection (`> 2^255`)
- [ ] Spender whitelist (Uniswap, Aave, etc.)
- [ ] Risk label: HIGH / MEDIUM / LOW
- [ ] Human-readable amount formatting

### D. Revoke (write path)
- [ ] Revoke button → `approve(spender, 0)`
- [ ] State machine: idle → signing → pending → confirmed / failed
- [ ] User rejection handled without crashing
- [ ] Failure reason shown (revert / gas)
- [ ] Refresh list after success

### E. AI explanation
- [ ] `/api/explain-approval`
- [ ] Output: what this approval means, max exposure, recommendation
- [ ] Prompt constraints to prevent hallucination
- [ ] Cache explanations

---

## V0.5 — optional (1–2 days)

- [ ] Postgres tables: `scans`, `approvals`, `revokes`
- [ ] `/api/scan` persists results
- [ ] `/wallet/history` simple list

---

## V1 — later

- [ ] Multi-chain (Polygon / Base / Arbitrum)
- [ ] NFT approvals (ERC-721 `setApprovalForAll`)
- [ ] Permit2
- [ ] SIWE login
- [ ] Batch revoke
- [ ] Trend charts

## V2 — future

- [ ] Browser extension
- [ ] Scheduled scans + alerts
- [ ] Team dashboard
- [ ] Public API

---

## Core logic (write by hand)

| # | Logic | Why |
| --- | --- | --- |
| 1 | Logs → aggregate by spender | Same spender appears many times |
| 2 | Events ≠ current state; reconcile with `allowance()` | Correctness |
| 3 | Risk scoring as pure functions | Testable, explainable |
| 4 | Revoke state machine | Most bug-prone |
| 5 | Error classification (rejected / failed / timeout) | UX |
| 6 | AI input construction and constraints | Prevent hallucination |

AI is fine for: layout, card components, types, config, fetch wrappers.

## Data model (V0.5)

```sql
scans(id, owner_address, chain_id, risk_score, created_at)
approvals(id, scan_id, token_address, token_symbol, spender_address,
          allowance_raw, is_unlimited, risk_level, spender_label)
revokes(id, approval_id, tx_hash, status, created_at)
```

## Security checklist

- [ ] `ETHERSCAN_API_KEY`, `LLM_API_KEY` server-side only
- [ ] Address format validation
- [ ] chainId whitelist
- [ ] API rate limiting (per IP)
- [ ] Never request private keys or auto-sign
- [ ] `.env.local` git-ignored

## Deliverables

- [ ] Public demo (`/tx` + `/wallet`)
- [ ] README (features, screenshots, architecture, local setup)
- [ ] `docs/DESIGN.md`
- [ ] 2–3 screenshots
- [ ] 30s demo video (optional)

## Schedule

| Week | Goal |
| --- | --- |
| 1 | Connect wallet → fetch logs → check allowance → list + risk labels |
| 2 | Revoke (write) + error handling + state refresh |
| 3 | AI explanation + at least one more chain + deploy + README |

## Definition of done

- [ ] Connected wallet shows real approvals
- [ ] Unlimited approvals flagged in red
- [ ] One approval can be revoked and the list refreshes
- [ ] Rejecting a signature does not crash the page
- [ ] AI explains an approval
- [ ] Publicly reachable, README complete
