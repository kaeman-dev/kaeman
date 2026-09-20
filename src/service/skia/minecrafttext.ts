import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import type { SimResult } from "../simulator";
import minecraftColors from "../../assets/minecraft-colors.json";
import renderSettings from "../../assets/minecraft-render.json";

const assets = join(__dirname, "../../../assets");

for (const font of Object.values(renderSettings.fonts))
  GlobalFonts.registerFromPath(join(assets, font.file), font.family);

const { regular, bold } = renderSettings.fonts;

const colors: Record<string, string> = minecraftColors;

interface Segment {
  text: string;
  color: string;
  bold: boolean;
}

const parse = (text: string): Segment[][] =>
  text.split("\n").map((line) => {
    const segments: Segment[] = [];
    let color = colors.f;
    let bold = false;
    let buffer = "";
    const flush = () => {
      if (buffer) segments.push({ text: buffer, color, bold });
      buffer = "";
    };
    for (let i = 0; i < line.length; i++) {
      const code = line[i + 1]?.toLowerCase();
      if (
        (line[i] === "&" || line[i] === "§") &&
        code &&
        (colors[code] || "lmnor".includes(code))
      ) {
        flush();
        if (colors[code]) {
          color = colors[code];
          bold = false;
        } else if (code === "l") bold = true;
        else if (code === "r") {
          color = colors.f;
          bold = false;
        }
        i++;
      } else buffer += line[i];
    }
    flush();
    return segments;
  });

export const renderMinecraft = async (result: Pick<SimResult, "type" | "text">): Promise<Buffer> => {
  const lines = result.text.split("\n").map((line) =>
    line.split("\t").map((cell) => parse(cell)[0]),
  );
  const width = 1920;
  const padding = 16;
  const canvas = createCanvas(width, 1080);
  const ctx = canvas.getContext("2d");

  let size = renderSettings.fontSizes[0];
  let columnWidths: number[] = [];
  for (const candidate of renderSettings.fontSizes) {
    const widths = lines.map((line) => line.map((cell) => {
      let width = 0;
      for (const seg of cell) {
        ctx.font = `${candidate}px "${(seg.bold ? bold : regular).family}"`;
        width += ctx.measureText(seg.text).width;
      }
      return width;
    }));
    const columns: number[] = [];
    for (const row of widths.filter((row) => row.length > 1)) {
      row.forEach((width, i) => columns[i] = Math.max(columns[i] ?? 0, width));
    }
    const tableWidth = columns.reduce((sum, width) => sum + width, 0)
      + Math.max(0, columns.length - 1) * candidate;
    const maxWidth = Math.max(tableWidth, ...widths.filter((row) => row.length === 1).flat());
    if (maxWidth + padding * 2 > width && candidate > renderSettings.fontSizes[0]) break;
    size = candidate;
    columnWidths = columns;
  }
  
  const lineHeight = size * 1.125;
  const height = Math.ceil(lines.length * lineHeight + padding * 2);

  canvas.width = width;
  canvas.height = height;

  const bg = await loadImage(readFileSync(join(assets, result.type)));
  const scale = Math.max(width / bg.width, height / bg.height);
  ctx.drawImage(
    bg,
    (width - bg.width * scale) / 2,
    (height - bg.height * scale) / 2,
    bg.width * scale,
    bg.height * scale,
  );
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, width, height);

  ctx.font = `${size}px "${regular.family}"`;
  const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } =
    ctx.measureText(" ");
  const halfLeading = (lineHeight - (ascent + descent)) / 2;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const offset = size / 8;

  lines.forEach((line, i) => {
    const baseline = padding + i * lineHeight + halfLeading + ascent;
    let columnX = padding;
    line.forEach((cell, column) => {
      let x = columnX;
      for (const seg of cell) {
        ctx.font = `${size}px "${(seg.bold ? bold : regular).family}"`;

        // shadow
        const dim = (shift: number) => Math.floor(((parseInt(seg.color.slice(1), 16) >> shift) & 255) * 0.25);
        ctx.fillStyle = `rgb(${dim(16)},${dim(8)},${dim(0)})`;
        ctx.fillText(seg.text, x + offset, baseline + offset);

        ctx.fillStyle = seg.color;
        ctx.fillText(seg.text, x, baseline);
        x += ctx.measureText(seg.text).width;
      }
      columnX += (columnWidths[column] ?? 0) + size;
    });
  });

  return canvas.toBuffer("image/png");
};
