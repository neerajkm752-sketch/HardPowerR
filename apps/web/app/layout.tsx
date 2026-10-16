import type { Metadata } from "next";
import { DM_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = { title: "Hard Power Index", description: "A hard-power geopolitical ranking dashboard" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="scroll-smooth"><body className={`${inter.variable} ${mono.variable}`}>{children}</body></html>;
}
