import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const image = await readFile(join(process.cwd(), "public", "brand", "replo-app-dark.jpg"), "base64");

  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", overflow: "hidden", background: "#000", borderRadius: 38 }}>
      <img src={`data:image/jpeg;base64,${image}`} alt="" width="640" height="360" style={{ position: "absolute", left: -80, top: -89 }} />
    </div>,
    size,
  );
}
