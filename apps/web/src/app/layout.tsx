import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CBeave Auction Platform",
  description:
    "Discover, sell, and bid in scheduled real-time online auctions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
