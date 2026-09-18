import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NyayaPack - LM Packaged Commodities Compliance Checker",
  description:
    "Scan any packaged commodity and check Legal Metrology (Packaged Commodities) Rules, 2011 compliance in seconds. A prototype for SIH 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Header />
        <main className="min-h-screen bg-slate-50">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
