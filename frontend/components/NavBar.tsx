"use client";
import Link from "next/link";

export function NavBar() {
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
      {/* Reown AppKit web component — renders connect button + social login modal */}
      <appkit-button />
    </nav>
  );
}
