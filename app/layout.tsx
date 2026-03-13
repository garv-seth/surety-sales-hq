import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Surety Sales HQ",
  description: "Sales command center for joinsurety.com",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ backgroundColor: '#f8fafc' }}>
        <Sidebar />
        <main className="ml-60 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
