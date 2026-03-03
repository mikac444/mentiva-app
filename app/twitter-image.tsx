import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mentiva — Your vision board, with a brain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same design as OG image
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #A1B392 0%, #6B7F5E 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,190,140,0.25) 0%, transparent 70%)",
            top: "15%",
            left: "35%",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: "0.35em",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 32,
            fontWeight: 300,
          }}
        >
          MENTIVA
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 300,
            color: "rgba(255,255,255,0.95)",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 800,
          }}
        >
          Your vision board, with a brain.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 300,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.7)",
            marginTop: 24,
          }}
        >
          Upload your dream. AI coaches you there daily.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 40,
            padding: "12px 28px",
            borderRadius: 50,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", textDecoration: "line-through" }}>
            $99/yr
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#D4BE8C" }}>
            $10 forever
          </div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.6)" }}>
            Founding Member
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
