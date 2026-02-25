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

export const metadata: Metadata = {
  title: "LEVER | Biomechanical Lift Comparison",
  description: "Compare how body proportions affect lift mechanics. See how height, limb length, and build change range of motion, work, and demand across squat, deadlift, bench, pullup, OHP, and more.",
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
