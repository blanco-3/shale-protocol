import type { Metadata } from "next";
import { Spectral, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { LayoutClient } from "./LayoutClient";

const serif = Spectral({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-serif" });
const sans  = Hanken_Grotesk({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-sans" });
const mono  = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "SHALE Protocol",
  description: "AI-managed adaptive yield vault on Arbitrum",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const cookies = hdrs.get("cookie");

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="shale-sandstone min-h-screen antialiased">
        <Providers cookies={cookies}>
          <LayoutClient>{children}</LayoutClient>
        </Providers>
      </body>
    </html>
  );
}
