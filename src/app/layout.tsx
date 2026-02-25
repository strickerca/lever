import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://lever.fitness";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LEVER | Biomechanical Lift Comparison",
    template: "%s | LEVER",
  },
  description:
    "Compare how body proportions affect lift mechanics. See how height, limb length, and build change range of motion, work, and demand across squat, deadlift, bench, pullup, OHP, and more.",
  keywords: [
    "biomechanics",
    "lift comparison",
    "squat analysis",
    "deadlift",
    "bench press",
    "body proportions",
    "moment arms",
    "lever arms",
    "strength standards",
    "Wilks alternative",
  ],
  authors: [{ name: "LEVER" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "LEVER",
    title: "LEVER | Biomechanical Lift Comparison",
    description:
      "Physics-based lift comparisons that account for body proportions, moment arms, and range of motion. The fairest way to compare lifters.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LEVER | Biomechanical Lift Comparison",
    description:
      "Physics-based lift comparisons that account for body proportions, moment arms, and range of motion.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <GlobalHeader />
        {children}
      </body>
    </html>
  );
}
