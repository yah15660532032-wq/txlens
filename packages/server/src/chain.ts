import "dotenv/config";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.MAINNET_RPC_URL ?? "https://ethereum-rpc.publicnode.com"),
});
