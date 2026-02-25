import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          borderRadius: "6px",
          fontSize: "20px",
          fontWeight: 900,
          color: "#e2e8f0",
          letterSpacing: "-0.02em",
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
