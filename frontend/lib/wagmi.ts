"use client";
import { createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [arbitrumSepolia.id]: http(
      "https://arb-sepolia.g.alchemy.com/v2/jQrzU79lUdexs3K1Q5A5F"
    ),
  },
  ssr: true,
});
