import { erc20Abi, formatUnits, getAddress, isAddress } from "viem";
import { publicClient } from "./chain.js";
import { KNOWN_SPENDERS, TOKENS } from "./config.js";
import { fetchApprovalSpenders } from "./etherscan.js";
import type { ApprovalInput, RiskLevel } from "./repos/scans.js";

export type ScanResult = {
  approvals: ApprovalInput[];
  riskScore: number;
};

const UNLIMITED_THRESHOLD = 2n ** 255n;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isUnlimited(allowance: bigint): boolean {
  return allowance >= UNLIMITED_THRESHOLD;
}

export function riskOf(allowance: bigint, spender: string): RiskLevel {
  const known = KNOWN_SPENDERS[spender.toLowerCase()];
  if (isUnlimited(allowance) && !known) return "high";
  if (!known) return "medium";
  return "low";
}

function scoreOf(approvals: ApprovalInput[]): number {
  const score = approvals.reduce((sum, approval) => {
    if (approval.riskLevel === "high") return sum + 40;
    if (approval.riskLevel === "medium") return sum + 10;
    return sum;
  }, 0);

  return Math.min(100, score);
}

/**
 * Scans one owner across the token whitelist.
 * Events give the candidate spenders; allowance() gives the truth.
 */
export async function scanOwner(owner: string, chainId = 1): Promise<ScanResult> {
  if (!isAddress(owner)) throw new Error("invalid owner address");

  const normalizedOwner = getAddress(owner);
  const approvals: ApprovalInput[] = [];

  for (const token of TOKENS) {
    let spenders: string[] = [];

    try {
      spenders = await fetchApprovalSpenders(normalizedOwner, token.address, chainId);
    } catch (error) {
      // A single token failure must not abort the whole scan
      console.error(`[scan] ${token.symbol} logs failed:`, (error as Error).message);
      await sleep(300);
      continue;
    }

    for (const spender of spenders) {
      if (!isAddress(spender)) continue;

      try {
        const allowance = await publicClient.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [normalizedOwner, getAddress(spender)],
        });

        if (allowance === 0n) continue;

        approvals.push({
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          spenderAddress: getAddress(spender),
          allowanceRaw: allowance.toString(),
          isUnlimited: isUnlimited(allowance),
          riskLevel: riskOf(allowance, spender),
        });
      } catch (error) {
        console.error(`[scan] ${token.symbol} allowance failed:`, (error as Error).message);
      }
    }

    // Etherscan free tier: ~5 req/s
    await sleep(300);
  }

  return { approvals, riskScore: scoreOf(approvals) };
}

export function formatAllowance(approval: ApprovalInput, decimals: number): string {
  if (approval.isUnlimited) return "Unlimited";
  return `${formatUnits(BigInt(approval.allowanceRaw), decimals)}`;
}
