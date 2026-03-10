import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mentiva — Your vision board, with a brain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "linear-gradient(172deg, #B2C4A0 0%, #C0D4AA 25%, #CCDABC 48%, #D3D0C4 72%, #DAD7CB 100%)",
          position: "relative",
        }}
      >
        {/* Subtle gold accent circle */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(157,180,140,0.25) 0%, transparent 70%)",
            top: "15%",
            left: "35%",
          }}
        />

        {/* Brand name */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: "0.35em",
            color: "#9DA894",
            marginBottom: 32,
            fontWeight: 300,
          }}
        >
          MENTIVA
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 300,
            color: "#2C3028",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 800,
          }}
        >
          Your vision board, with a brain.
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 300,
            fontStyle: "italic",
            color: "#5A6352",
            marginTop: 24,
          }}
        >
          Upload your dream. AI coaches you there daily.
        </div>

        {/* Price badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 40,
            padding: "12px 28px",
            borderRadius: 50,
            background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(44,48,40,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "#7E8C74",
              textDecoration: "line-through",
            }}
          >
            $99/yr
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#6B7E5C",
            }}
          >
            $10 forever
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#7E8C74",
            }}
          >
            Founding Member
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
