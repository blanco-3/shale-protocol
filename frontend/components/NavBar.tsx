"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StrataMark } from "./ui/StrataMark";

const NAV_LINKS = [
  { href: "/app",        label: "Dashboard" },
  { href: "/deposit",    label: "Deposit" },
  { href: "/portfolio",  label: "Portfolio" },
  { href: "/analytics",  label: "Analytics" },
  { href: "/safety",     label: "Safety" },
  { href: "/scenarios",  label: "Scenarios" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: "60px", padding: "0 28px",
      background: "rgba(249,244,234,0.88)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <Link href="/" style={{ display: "flex", textDecoration: "none" }}>
        <StrataMark size={32} wordmark wordmarkStyle="caps" color="var(--rock-700)" />
      </Link>

      <nav style={{ display: "flex", gap: "4px" }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "13px",
              color: active ? "var(--text-strong)" : "var(--text-muted)",
              background: active ? "var(--surface-raised)" : "transparent",
              border: active ? "1px solid var(--border)" : "1px solid transparent",
              boxShadow: active ? "var(--shadow-xs)" : "none",
              padding: "8px 14px", borderRadius: "var(--r-pill)",
              textDecoration: "none",
              transition: "all var(--dur-fast) var(--ease-out)",
            }}>{label}</Link>
          );
        })}
      </nav>

      {/* Reown AppKit web component — renders connect button + social login modal */}
      <appkit-button />
    </header>
  );
}
