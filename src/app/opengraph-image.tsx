import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LEVER — Biomechanical Lift Comparison";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e293b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent gradient bar at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #2563eb, #475569, #ea580c)",
          }}
        />

        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            zIndex: 1,
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: "80px",
              fontWeight: 800,
              letterSpacing: "0.25em",
              color: "#e2e8f0",
              textTransform: "uppercase" as const,
            }}
          >
            LEVER
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "#94a3b8",
              maxWidth: "700px",
              textAlign: "center" as const,
              lineHeight: 1.4,
            }}
          >
            Physics-Based Lift Comparisons
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            {["Moment Arms", "Range of Motion", "Body Proportions"].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "9999px",
                    border: "1px solid rgba(148,163,184,0.3)",
                    color: "#cbd5e1",
                    fontSize: "18px",
                    fontWeight: 500,
                    background: "rgba(15,23,42,0.6)",
                  }}
                >
                  {label}
                </div>
              )
            )}
          </div>
        </div>

        {/* URL footer */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "18px",
            color: "#475569",
            fontWeight: 600,
            letterSpacing: "0.1em",
          }}
        >
          lever.fitness
        </div>
      </div>
    ),
    { ...size }
  );
}
