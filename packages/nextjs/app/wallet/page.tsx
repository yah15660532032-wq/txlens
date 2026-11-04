"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import {
  type Approval,
  client,
  isUnlimited,
  riskOf,
  scanApprovals,
  shortAddress,
  spenderLabel,
} from "~~/utils/approvals";

const RISK_STYLE: Record<string, string> = {
  high: "badge-error",
  medium: "badge-warning",
  low: "badge-success",
};

type RevokeStatus = "signing" | "pending" | "done" | "error";

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [target, setTarget] = useState("");
  const [scannedOwner, setScannedOwner] = useState("");
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, RevokeStatus>>({});
  const [revokeError, setRevokeError] = useState("");

  async function runScan(owner: string) {
    setError("");
    setApprovals(null);
    setScanning(true);
    try {
      const result = await scanApprovals(owner);
      setApprovals(result);
      setScannedOwner(owner);
    } catch (e: any) {
      setError(e.shortMessage ?? e.message ?? "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  function handleScan() {
    const owner = target.trim() || address;
    if (!owner) {
      setError("Connect a wallet or paste an address first.");
      return;
    }
    void runScan(owner);
  }

  async function handleRevoke(a: Approval) {
    const key = a.token + a.spender;
    setRevokeError("");
    setRevoking(key);
    setStatus(s => ({ ...s, [key]: "signing" }));

    try {
      const hash = await writeContractAsync({
        address: a.token,
        abi: erc20Abi,
        functionName: "approve",
        args: [a.spender, 0n],
      });

      setStatus(s => ({ ...s, [key]: "pending" }));
      await client.waitForTransactionReceipt({ hash });
      setStatus(s => ({ ...s, [key]: "done" }));

      // Refresh the list so the revoked row disappears
      if (scannedOwner) void runScan(scannedOwner);
    } catch (e: any) {
      setStatus(s => ({ ...s, [key]: "error" }));
      // 4001 = user rejected the signature request in the wallet
      if (e?.code === 4001 || /rejected/i.test(e?.message ?? "")) {
        setRevokeError("You rejected the transaction in your wallet.");
      } else {
        setRevokeError(e.shortMessage ?? e.message ?? "Revoke failed");
      }
    } finally {
      setRevoking(null);
    }
  }

  const canRevoke = isConnected && !!address && scannedOwner.toLowerCase() === address.toLowerCase();

  return (
    <div className="flex flex-col items-center gap-6 pt-12 px-5 pb-20">
      <h1 className="text-3xl font-bold">My Approvals</h1>
      <p className="text-center opacity-70 max-w-xl">
        See which contracts can spend your tokens, and revoke what you no longer need.
      </p>

      <ConnectButton />

      <div className="w-full max-w-2xl card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-3">
          <input
            className="input input-bordered w-full font-mono text-sm"
            placeholder={address ?? "0x... (optional, defaults to connected wallet)"}
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
          <button className="btn btn-primary w-full" onClick={handleScan} disabled={scanning}>
            {scanning ? "Scanning..." : "Scan approvals"}
          </button>
          {!isConnected && (
            <p className="text-xs opacity-60">
              You can scan any address read-only, or connect a wallet to revoke later.
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-error max-w-2xl">{error}</p>}
      {revokeError && <p className="text-warning max-w-2xl">{revokeError}</p>}

      {scanning && <span className="loading loading-spinner loading-lg" />}

      {approvals && approvals.length === 0 && <p className="opacity-60">No active approvals found for this address.</p>}

      {approvals && approvals.length > 0 && (
        <div className="w-full max-w-2xl flex flex-col gap-3">
          {approvals.map(a => {
            const key = a.token + a.spender;
            const st = status[key];
            return (
              <div key={key} className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body py-4 gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{a.symbol}</span>
                      <span className={`badge badge-sm ${RISK_STYLE[riskOf(a)]}`}>{riskOf(a).toUpperCase()}</span>
                    </div>
                    <span className="text-xs opacity-60">{spenderLabel(a.spender)}</span>
                  </div>

                  <p className="font-mono text-xs" title={a.spender}>
                    {shortAddress(a.spender)}
                  </p>

                  <p className="text-sm">
                    Allowance:{" "}
                    <span className="font-semibold">
                      {isUnlimited(a.allowance) ? "Unlimited" : `${formatUnits(a.allowance, a.decimals)} ${a.symbol}`}
                    </span>
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    {st === "signing" && <span className="text-xs opacity-70">Waiting for signature...</span>}
                    {st === "pending" && <span className="text-xs opacity-70">Pending on-chain...</span>}
                    {st === "done" && <span className="text-xs text-success">Revoked</span>}
                    {st === "error" && <span className="text-xs text-error">Failed</span>}

                    <button
                      className="btn btn-sm btn-outline btn-error"
                      disabled={!canRevoke || !!revoking || st === "pending" || st === "done"}
                      onClick={() => handleRevoke(a)}
                      title={canRevoke ? "" : "Connect the owning wallet to revoke"}
                    >
                      {revoking === key ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
