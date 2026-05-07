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
  title: "LeRoy Harvey — memories & music",
  description:
    "A place for LeRoy Harvey’s music, community work, photos, and links — shared by family.",
  openGraph: {
    title: "LeRoy Harvey — memories & music",
    description:
      "A place for LeRoy Harvey’s music, community work, photos, and links — shared by family.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${literata.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col antialiased section-green">
        {children}
      </body>
    </html>
  );
}
