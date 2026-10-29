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
  const EXAMPLE_HASH = "0x62146f27e9b3ba4a401097758a3a6d99b71b751ced0d598ee0410decdfa3fc76";
  async function handleFetch(inputHash: string = hash) {
    setError("");
    setResult(null);

    if (!/^0x[a-fA-F0-9]{64}$/.test(inputHash)) {
      setError("hash格式不对:0x+64位十六进制");
      return;
    }

    setLoading(true);
    try {
      const tx = await client.getTransaction({ hash: inputHash as `0x${string}` });
      const receipt = await client.getTransactionReceipt({ hash: inputHash as `0x${string}` });
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
      <p className="text-center opacity-70 max-w-xl">
        Paste any Ethereum Sepolia transaction hash to see what actually happened, explained in plain language by AI.
      </p>
      <input
        className="input input-bordered w-full max-w-x"
        placeholder="0x..."
        value={hash}
        onChange={e => setHash(e.target.value)}
      />
      <button className="btn btn-primary" onClick={() => handleFetch()} disabled={loading}>
        {loading ? "查询中..." : "查询"}
      </button>
      <button
        className="btn btn-sm"
        onClick={() => {
          setHash(EXAMPLE_HASH);
          handleFetch(EXAMPLE_HASH);
        }}
      >
        Try an example
      </button>
      {error && <p className="text-error">{error}</p>}
      {result && (
        <div className="w-full max-w-2xl card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">On-chain data</h2>
            <div className="space-y-2 text-sm">
              <p>
                <b>From:</b> <span className="font-mono break-all">{result.tx.from}</span>
              </p>
              <p>
                <b>To:</b> <span className="font-mono break-all">{result.tx.to}</span>
              </p>
              <p>
                <b>Value:</b> {formatEther(result.tx.value)} ETH
              </p>
              <p>
                <b>Nonce:</b> {result.tx.nonce}
              </p>
              <p>
                <b>Status:</b> {result.receipt.status}
              </p>
              <p>
                <b>Gas Used:</b> {result.receipt.gasUsed.toString()}
              </p>
            </div>
          </div>
        </div>
      )}
      {explanation && (
        <div className="w-full max-w-2xl card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">AI explanation</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
