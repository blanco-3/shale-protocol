"use client";
import { usePathname } from "next/navigation";
import { NavBar } from "../components/NavBar";
import type { ReactNode } from "react";

export function LayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    // Landing is full-viewport with its own nav — skip app chrome
    return <>{children}</>;
  }

  return (
    <>
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </>
  );
}
