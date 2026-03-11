import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "linear-gradient(145deg, #B8CCA6 0%, #A4B890 50%, #8FA67A 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Aura glow */}
        <div
          style={{
            position: "absolute",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,239,224,0.7) 0%, rgba(187,203,168,0.3) 40%, transparent 70%)",
            top: 2,
            left: 2,
          }}
        />
        {/* 4-point sparkle star */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 32 32"
          style={{ position: "relative" }}
        >
          <path
            d="M16 3 C16.8 10, 22 15.2, 29 16 C22 16.8, 16.8 22, 16 29 C15.2 22, 10 16.8, 3 16 C10 15.2, 15.2 10, 16 3Z"
            fill="rgba(255,255,255,0.92)"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
