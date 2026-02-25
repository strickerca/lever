import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detailed Compare",
  description:
    "In-depth biomechanical comparison with full control over lift variants, stances, and segment measurements for precise analysis.",
  openGraph: {
    title: "Detailed Compare | LEVER",
    description:
      "Advanced biomechanical lift comparison with full variant control and custom segment measurements.",
  },
};

export default function DetailedCompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
