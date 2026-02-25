import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LEVER — Biomechanical Lift Comparison",
    short_name: "LEVER",
    description:
      "Physics-based lift comparisons that account for body proportions, moment arms, and range of motion.",
    start_url: "/compare/quick",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
