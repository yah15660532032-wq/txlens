import "dotenv/config";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// Local dev in CN needs the proxy; Vercel/server environments do not set HTTPS_PROXY.
if (process.env.HTTPS_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY));
}

const APPROVAL_TOPIC =
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Returns the distinct spenders that have ever been approved for `token` by `owner`.
 * Note: an Approval event is history, not current state — callers must reconcile
 * with allowance() before showing anything as active.
 */
export async function fetchApprovalSpenders(
  owner: string,
  token: string,
  chainId = 1,
): Promise<string[]> {
  if (!ADDRESS_RE.test(owner) || !ADDRESS_RE.test(token)) {
    throw new Error("invalid address");
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("ETHERSCAN_API_KEY is not set");

  const paddedOwner = "0x" + owner.slice(2).toLowerCase().padStart(64, "0");

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "logs");
  url.searchParams.set("action", "getLogs");
  url.searchParams.set("address", token);
  url.searchParams.set("topic0", APPROVAL_TOPIC);
  url.searchParams.set("topic1", paddedOwner);
  url.searchParams.set("topic0_1_opr", "and");
  // Etherscan rejects getLogs without an explicit range (returns "Invalid API Key")
  url.searchParams.set("fromBlock", "0");
  url.searchParams.set("toBlock", "latest");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "100");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url);
  const json = (await res.json()) as {
    status: string;
    message: string;
    result: unknown;
  };

  if (json.status !== "1") {
    const message = String(json.message ?? "");
    if (message.toLowerCase().includes("no records")) return [];

    const detail = typeof json.result === "string" ? json.result : message;
    throw new Error(`etherscan: ${detail}`);
  }

  const logs = json.result as { topics: string[] }[];

  return Array.from(
    new Set(logs.map((log) => "0x" + String(log.topics[2]).slice(26).toLowerCase())),
  );
}
