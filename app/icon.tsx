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
          borderRadius: 6,
          background: "linear-gradient(135deg, #A1B392 0%, #6B7F5E 100%)",
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: "#D4BE8C",
            fontFamily: "serif",
            lineHeight: 1,
          }}
        >
          M
        </span>
      </div>
    ),
    { ...size }
  );
}
