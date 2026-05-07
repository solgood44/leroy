import type { Metadata } from "next";
import { Literata, Outfit } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LeRoy Harvey — memories",
  description:
    "Photos, videos, and words from family and friends for LeRoy Harvey.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${literata.variable} ${outfit.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
