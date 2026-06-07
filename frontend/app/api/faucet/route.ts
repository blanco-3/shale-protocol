import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseAbi, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const FAUCET_AMOUNT = 10_000n * 1_000_000n; // 10,000 USDC (6 decimals)
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const RPC = process.env.ARBITRUM_SEPOLIA_RPC!;
const FAUCET_KEY = process.env.FAUCET_PRIVATE_KEY as `0x${string}`;

const USDC_ABI = parseAbi(["function mint(address to, uint256 amount) external"]);

// Simple in-memory rate limit: address → last drip timestamp
const lastDrip = new Map<string, number>();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const addr = address.toLowerCase();
    const now = Date.now();
    const last = lastDrip.get(addr) ?? 0;

    if (now - last < COOLDOWN_MS) {
      const remainingMins = Math.ceil((COOLDOWN_MS - (now - last)) / 60000);
      return NextResponse.json(
        { error: `Rate limited. Try again in ${remainingMins} min.` },
        { status: 429 }
      );
    }

    const account = privateKeyToAccount(FAUCET_KEY);
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(RPC),
    });
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(RPC),
    });

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "mint",
      args: [address as `0x${string}`, FAUCET_AMOUNT],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    lastDrip.set(addr, now);

    return NextResponse.json({
      success: true,
      txHash: hash,
      amount: "10000",
      address,
    });
  } catch (err: unknown) {
    console.error("[faucet]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Faucet error" },
      { status: 500 }
    );
  }
}
