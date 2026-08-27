import type { Metadata } from "next";
import { Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WARREN — Jurisdiction-Aware Technical Knowledge System",
  description: "Dense, jurisdiction-aware knowledge system for banking and finance professionals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-[#0B0C0E] text-[#E6E8EB] antialiased selection:bg-[#2A1D10] selection:text-[#C9711F]">
        {children}
      </body>
    </html>
  );
}
