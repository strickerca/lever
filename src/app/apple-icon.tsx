import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617, #0f172a)",
          fontSize: "100px",
          fontWeight: 900,
          color: "#e2e8f0",
          letterSpacing: "0.05em",
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
