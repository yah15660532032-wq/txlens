/*
 * @description:
 * @param:
 * @return:
 * @Date: 2026-11-02 16:25:51
 */
import { NextResponse } from "next/server";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// keccak256("Approval(address,address,uint256)")
// 本地开发时让 Node 走梯子；Vercel 上没有这个变量，会自动跳过
if (process.env.HTTPS_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY));
}
const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const token = searchParams.get("token");

  if (!owner || !ADDRESS_RE.test(owner)) {
    return NextResponse.json({ error: "invalid owner address" }, { status: 400 });
  }
  if (!token || !ADDRESS_RE.test(token)) {
    return NextResponse.json({ error: "invalid token address" }, { status: 400 });
  }

  // topic1 must be a 32-byte value, left-padded with zeros
  const paddedOwner = "0x" + owner.slice(2).toLowerCase().padStart(64, "0");

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "logs");
  url.searchParams.set("action", "getLogs");
  url.searchParams.set("address", token);
  url.searchParams.set("topic0", APPROVAL_TOPIC);
  url.searchParams.set("topic1", paddedOwner);
  url.searchParams.set("topic0_1_opr", "and");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "100");
  // Etherscan rejects getLogs without an explicit block range (returns "Invalid API Key")
  url.searchParams.set("fromBlock", "0");
  url.searchParams.set("toBlock", "latest");
  url.searchParams.set("apikey", process.env.ETHERSCAN_API_KEY ?? "");

  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    if (json.status !== "1") {
      const message = String(json.message ?? "");
      // "No records found" is a normal empty result, not an error
      if (message.toLowerCase().includes("no records")) {
        return NextResponse.json({ spenders: [], count: 0 });
      }
      // When status is "0", Etherscan puts the useful text in `result`
      const detail = typeof json.result === "string" && json.result ? json.result : message;
      return NextResponse.json({ error: detail || "etherscan error", result: json.result ?? [] }, { status: 502 });
    }

    // topics[2] = spender
    const spenders = Array.from(
      new Set<string>((json.result as any[]).map(log => "0x" + String(log.topics[2]).slice(26).toLowerCase())),
    );

    return NextResponse.json({ spenders, count: spenders.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "request failed" }, { status: 500 });
  }
}
