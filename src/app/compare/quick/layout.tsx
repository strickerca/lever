import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick Compare",
  description:
    "Instantly compare two lifters' biomechanics — see how height, limb lengths, and body proportions affect work, moment arms, and equivalent load.",
  openGraph: {
    title: "Quick Compare | LEVER",
    description:
      "Physics-based lift comparison — see how body proportions change the difficulty of squat, deadlift, bench, and more.",
  },
};

export default function QuickCompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
