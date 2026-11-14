import { pool } from "../db.js";

export type RiskLevel = "high" | "medium" | "low";

export type ApprovalInput = {
  tokenAddress: string;
  tokenSymbol: string;
  spenderAddress: string;
  allowanceRaw: string;
  isUnlimited: boolean;
  riskLevel: RiskLevel;
};

/**
 * Insert one scan and its approvals inside a transaction.
 * Either everything is written, or nothing is.
 */
export async function createScan(
  owner: string,
  chainId: number,
  riskScore: number,
  approvals: ApprovalInput[],
): Promise<string> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const { rows } = await client.query<{ id: string }>(
      `insert into scans (owner_address, chain_id, risk_score)
       values ($1, $2, $3)
       returning id`,
      [owner, chainId, riskScore],
    );

    const scanId = rows[0].id;

    for (const approval of approvals) {
      await client.query(
        `insert into approvals
           (scan_id, token_address, token_symbol, spender_address,
            allowance_raw, is_unlimited, risk_level)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          scanId,
          approval.tokenAddress,
          approval.tokenSymbol,
          approval.spenderAddress,
          approval.allowanceRaw,
          approval.isUnlimited,
          approval.riskLevel,
        ],
      );
    }

    await client.query("commit");
    return scanId;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Record a revoke attempt. Kept separate from `approvals` because a revoke has
 * its own lifecycle (pending → confirmed / failed).
 */
export async function createRevoke(
  approvalId: string,
  status: "pending" | "confirmed" | "failed",
  txHash: string | null,
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into revokes (approval_id, tx_hash, status)
     values ($1, $2, $3)
     returning id`,
    [approvalId, txHash, status],
  );

  return rows[0].id;
}

/**
 * Read a scan list with approvals aggregated per scan.
 * Uses the (owner_address, created_at desc) index.
 */
export async function listScans(owner: string, limit = 20) {
  const { rows } = await pool.query(
    `select
       s.id,
       s.owner_address,
       s.chain_id,
       s.risk_score,
       s.created_at,
       coalesce(
         json_agg(
           json_build_object(
             'approvalId', a.id,
             'symbol', a.token_symbol,
             'tokenAddress', a.token_address,
             'spender', a.spender_address,
             'allowanceRaw', a.allowance_raw::text,
             'isUnlimited', a.is_unlimited,
             'riskLevel', a.risk_level
           )
         ) filter (where a.id is not null),
         '[]'
       ) as approvals
     from scans s
     left join approvals a on a.scan_id = s.id
     where s.owner_address = $1
     group by s.id
     order by s.created_at desc
     limit $2`,
    [owner, limit],
  );

  return rows;
}
