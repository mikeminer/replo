import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const image = await readFile(join(process.cwd(), "public", "brand", "replo-light.jpg"), "base64");

  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", overflow: "hidden", background: "#f4f7f8", borderRadius: 14 }}>
      <img src={`data:image/jpeg;base64,${image}`} alt="" width="64" height="96" style={{ position: "absolute", left: 0, top: -16 }} />
    </div>,
    size,
  );
}
