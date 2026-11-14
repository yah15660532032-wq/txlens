import { type Approval, TOKENS } from "./approvals";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type RiskLevel = "high" | "medium" | "low";

export type UiApproval = Approval & {
  approvalId: string;
  isUnlimited: boolean;
  riskLevel: RiskLevel;
};

type ApprovalDto = {
  approvalId: string;
  symbol: string;
  tokenAddress: string;
  spender: string;
  allowanceRaw: string;
  isUnlimited: boolean;
  riskLevel: RiskLevel;
};

type ScanDto = {
  id: string;
  owner_address: string;
  chain_id: number;
  risk_score: number;
  created_at: string;
  approvals: ApprovalDto[];
};

type JobDto = {
  id: string;
  state: "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";
  result: { scanId: string; approvalCount: number } | null;
  failedReason: string | null;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || body?.error) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }

  return body.data as T;
}

export async function startScan(owner: string, chainId = 1): Promise<string> {
  const data = await request<{ jobId: string }>("/api/scans/async", {
    method: "POST",
    body: JSON.stringify({ owner, chainId }),
  });
  return data.jobId;
}

export async function getJob(jobId: string): Promise<JobDto> {
  return request<JobDto>(`/api/jobs/${jobId}`);
}

export async function waitForScan(jobId: string, timeoutMs = 120_000): Promise<JobDto> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getJob(jobId);

    if (job.state === "completed") return job;
    if (job.state === "failed") throw new Error(job.failedReason ?? "Scan failed");

    await sleep(1500);
  }

  throw new Error("Scan timed out — the worker may be backed up.");
}

export async function listScans(owner: string): Promise<ScanDto[]> {
  return request<ScanDto[]>(`/api/scans?owner=${owner}`);
}

/**
 * Full server-side scan: enqueue → poll job → read the stored result.
 * The browser never talks to Etherscan or RPC for this flow.
 */ export async function scanViaServer(owner: string): Promise<UiApproval[]> {
  const jobId = await startScan(owner);
  const job = await waitForScan(jobId);
  const scanId = job.result?.scanId;

  const scans = await listScans(owner);
  const scan = scans.find(item => item.id === scanId) ?? scans[0];

  if (!scan) return [];

  return scan.approvals.map(approval => {
    const token = TOKENS.find(t => t.address.toLowerCase() === approval.tokenAddress.toLowerCase());

    return {
      approvalId: approval.approvalId,
      symbol: approval.symbol,
      token: approval.tokenAddress,
      decimals: token?.decimals ?? 18,
      spender: approval.spender,
      allowance: BigInt(approval.allowanceRaw),
      isUnlimited: approval.isUnlimited,
      riskLevel: approval.riskLevel,
    };
  });
}

export type RevokeStatus = "pending" | "confirmed" | "failed";

/**
 * Persist the revoke lifecycle so the UI state can be audited later.
 * The chain is the source of truth; this is our record of the attempt.
 */
export async function recordRevoke(approvalId: string, status: RevokeStatus, txHash: string | null): Promise<void> {
  await request<{ id: string }>("/api/revokes", {
    method: "POST",
    body: JSON.stringify({ approvalId, status, txHash }),
  });
}
