import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "../components/NavBar";

const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "SHALE Protocol",
  description: "Adaptive yield layers on Arbitrum",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="bg-white text-black min-h-screen font-mono antialiased">
        <Providers>
          <NavBar />
          <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
