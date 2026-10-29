/*
 * @description:
 * @param:
 * @return:
 * @Date: 2026-10-29 09:32:18
 */
"use client";

import { useState } from "react";
import { createPublicClient, formatEther, http } from "viem";
import { sepolia } from "viem/chains";

const client = createPublicClient({ chain: sepolia, transport: http() });

export default function Txpage() {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<{ tx: any; receipt: any } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");
  async function handleFetch() {
    setError("");
    setResult(null);

    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      setError("hash格式不对:0x+64位十六进制");
      return;
    }

    setLoading(true);
    try {
      const tx = await client.getTransaction({ hash: hash as `0x${string}` });
      const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
      console.log("receipt:", receipt); // 👈 加这里
      console.log("gasUsed:", receipt.gasUsed.toString()); // 👈
      console.log("cumulative:", receipt.cumulativeGasUsed.toString());
      setResult({ tx, receipt });
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tx: {
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
            nonce: tx.nonce,
            input: tx.input,
          },
          receipt: {
            status: receipt.status,
            gasUsed: receipt.gasUsed.toString(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI request failed");
      setExplanation(data.explanation);
    } catch (e: any) {
      setError(e.shortMessage ?? e.message ?? "查询失败");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex flex-col items-center gap-4 pt-16 px-5">
      <h1 className="text-3xl font-bold">TxLens</h1>
      <p className="text-sm opacity-70">输入Sepolia交易hash,查看链上详情</p>
      <input
        className="input input-bordered w-full max-w-x"
        placeholder="0x..."
        value={hash}
        onChange={e => setHash(e.target.value)}
      />
      <button className="btn btn-primary" onClick={handleFetch} disabled={loading}>
        {loading ? "查询中..." : "查询"}
      </button>
      {error && <p className="text-error">{error}</p>}
      {result && (
        <div className="w-full max-w-xl bg-base-200 p-4 rounded-lg text-sm space-y-2">
          <p>
            <b>From:</b>
            {result.tx.from}
          </p>
          <p>
            <b>To:</b>
            {result.tx.to}
          </p>
          <p>
            <b>Value:</b>
            {formatEther(result.tx.value)}ETH
          </p>
          <p>
            <b>Nonce:</b>
            {result.tx.nonce}
          </p>
          <p>
            <b>Status:</b>
            {result.receipt.status}
          </p>
          <p>
            <b>Gas Used:</b>
            {result.receipt.gasUsed.toString()}
          </p>
        </div>
      )}
      {explanation && (
        <div className="w-full max-w-xl whitespace-pre-wrap big-base-100 p-4 rounded-lg">
          <b>AI 解释</b>
          {"\n\n"}
          {explanation}
        </div>
      )}
    </div>
  );
}
