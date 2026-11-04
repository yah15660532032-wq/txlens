/*
 * @description:
 * @param:
 * @return:
 * @Date: 2026-11-03 15:14:56
 */
import { createPublicClient, erc20Abi, getAddress, http, isAddress } from "viem";
import { mainnet } from "viem/chains";

export const client = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

export type Token = {
  symbol: string;
  address: string;
  decimals: number;
};

export const TOKENS: Token[] = [
  { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
  { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
];

export type Approval = {
  symbol: string;
  token: string;
  decimals: number;
  spender: string;
  allowance: bigint;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function scanApprovals(owner: string): Promise<Approval[]> {
  const result: Approval[] = [];
  const errors: string[] = [];

  for (const token of TOKENS) {
    try {
      const res = await fetch(`/api/approvals?owner=${owner}&token=${token.address}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data.spenders)) {
        throw new Error(data.error ?? `approvals API failed (${res.status})`);
      }

      for (const spender of data.spenders as string[]) {
        if (!isAddress(spender)) continue;
        const spenderAddr = getAddress(spender);

        try {
          const allowance = await client.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [owner, spenderAddr],
          });

          if (allowance > 0n) {
            result.push({
              symbol: token.symbol,
              token: token.address,
              decimals: token.decimals,
              spender: spenderAddr,
              allowance,
            });
          }
        } catch (e: any) {
          errors.push(`${token.symbol} allowance: ${e.shortMessage ?? e.message}`);
        }
      }
    } catch (e: any) {
      errors.push(`${token.symbol}: ${e.message ?? "request failed"}`);
    }

    // Etherscan free tier allows ~5 requests/second
    await sleep(300);
  }

  // Only fail the whole scan when nothing could be read and there were errors
  if (result.length === 0 && errors.length > 0 && errors.length >= TOKENS.length) {
    throw new Error(errors[0]);
  }

  return result;
}

// Known spenders (lowercase) — used for labels and risk scoring
export const KNOWN_SPENDERS: Record<string, string> = {
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3 Router",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap V3 Router 02",
  "0x000000000022d473030f116ddee9f6b43ac78ba3": "Permit2",
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch V5",
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": "Aave V3 Pool",
};

/** Max uint256 approvals are "unlimited" — the spender can drain the balance any time */
export function isUnlimited(allowance: bigint): boolean {
  return allowance >= 2n ** 255n;
}

export type RiskLevel = "high" | "medium" | "low";

export function riskOf(approval: Approval): RiskLevel {
  const known = KNOWN_SPENDERS[approval.spender.toLowerCase()];
  if (isUnlimited(approval.allowance) && !known) return "high";
  if (!known) return "medium";
  return "low";
}

export function spenderLabel(spender: string): string {
  return KNOWN_SPENDERS[spender.toLowerCase()] ?? "Unknown contract";
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
