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
  title: "LeRoy Harvey — memories & updates",
  description:
    "Family updates, photos, and messages for LeRoy Harvey. Leave a note, share a photo, or read words from friends and family.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
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
