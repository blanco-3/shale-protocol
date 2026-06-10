"use client";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrumSepolia } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { http } from "wagmi";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID ?? "be8ea39950ed4305082f74eb79295092";

const ALCHEMY_RPC = "https://arb-sepolia.g.alchemy.com/v2/jQrzU79lUdexs3K1Q5A5F";

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [arbitrumSepolia];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
  transports: {
    [arbitrumSepolia.id]: http(ALCHEMY_RPC),
  },
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "SHALE Protocol",
    description: "AI-managed adaptive yield vault on Arbitrum",
    url: typeof window !== "undefined" ? window.location.origin : "https://shale.xyz",
    icons: ["https://avatars.githubusercontent.com/u/179229932?s=200&v=4"],
  },
  features: {
    analytics: true,
    email: true,
    socials: ["google", "x", "github", "discord", "farcaster"],
    emailShowWallets: true,
  },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#000000",
    "--w3m-border-radius-master": "0px",
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
