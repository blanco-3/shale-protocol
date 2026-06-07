"use client";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function NavBar() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
      <Link href="/" className="text-xl font-bold tracking-widest">
        SHALE
      </Link>
      <div className="flex gap-6 text-sm">
        <Link href="/" className="hover:underline">Dashboard</Link>
        <Link href="/deposit" className="hover:underline">Deposit</Link>
        <Link href="/portfolio" className="hover:underline">Portfolio</Link>
      </div>
      {isConnected ? (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <button
            onClick={() => disconnect()}
            className="text-xs border border-gray-300 px-3 py-1 hover:border-black transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={() => connect({ connector: connectors[0] })}
          className="text-sm border border-black px-4 py-1 hover:bg-black hover:text-white transition-colors"
        >
          Connect Wallet
        </button>
      )}
    </nav>
  );
}
