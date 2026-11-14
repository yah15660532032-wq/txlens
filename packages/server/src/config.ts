export type TokenConfig = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

/**
 * Week 2–3 scope: Ethereum mainnet, four high-liquidity tokens.
 * Adding chains/tokens is a config change, not a code change.
 */
export const TOKENS: TokenConfig[] = [
  { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
  { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
];

/** Known spenders get a lower risk score (lowercase keys). */
export const KNOWN_SPENDERS: Record<string, string> = {
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3 Router",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap V3 Router 02",
  "0x000000000022d473030f116ddee9f6b43ac78ba3": "Permit2",
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch V5",
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": "Aave V3 Pool",
};
