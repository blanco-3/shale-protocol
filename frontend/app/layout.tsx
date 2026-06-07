import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "../components/NavBar";

const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "SHALE Protocol",
  description: "AI-managed adaptive yield vault on Arbitrum",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const cookies = hdrs.get("cookie");

  return (
    <html lang="en" className={mono.variable}>
      <body className="bg-white text-black min-h-screen font-mono antialiased">
        <Providers cookies={cookies}>
          <NavBar />
          <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
