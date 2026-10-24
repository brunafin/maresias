import { ImageResponse } from "next/og";

const PAPER = "#f6f1e8";
const INK = "#1c1612";

export function appIcon(size: number) {
  const fontSize = Math.round(size * 0.62);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: PAPER,
        color: INK,
        fontSize,
        fontFamily: "geist",
        lineHeight: 1,
      }}
    >
      <div style={{ display: "flex", marginBottom: Math.round(size * 0.08) }}>m</div>
    </div>,
    { width: size, height: size },
  );
}
