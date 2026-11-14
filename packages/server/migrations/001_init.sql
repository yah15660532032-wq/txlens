-- 001_init.sql
-- Week 2: core tables for Wallet Safety

create extension if not exists "pgcrypto";

create table if not exists scans (
  id            uuid primary key default gen_random_uuid(),
  owner_address text        not null,
  chain_id      integer     not null default 1,
  risk_score    integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists scans_owner_created_idx
  on scans (owner_address, created_at desc);

create table if not exists approvals (
  id             uuid primary key default gen_random_uuid(),
  scan_id        uuid        not null references scans (id) on delete cascade,
  token_address  text        not null,
  token_symbol   text        not null,
  spender_address text       not null,
  allowance_raw  numeric     not null,
  is_unlimited   boolean     not null default false,
  risk_level     text        not null default 'low',
  created_at     timestamptz not null default now()
);

create index if not exists approvals_scan_idx on approvals (scan_id);
create index if not exists approvals_spender_idx on approvals (spender_address);

create table if not exists revokes (
  id          uuid primary key default gen_random_uuid(),
  approval_id uuid        not null references approvals (id) on delete cascade,
  tx_hash     text,
  status      text        not null default 'pending',
  created_at  timestamptz not null default now()
);

create index if not exists revokes_approval_idx on revokes (approval_id);
