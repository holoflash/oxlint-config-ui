import { ANSI, SYMBOLS } from "./constants.js";

export function colorize(text: string, color: string): string {
  return `${color}${text}${ANSI.reset}`;
}

export function writeAt({
  buffer,
  row,
  col,
  content,
}: {
  buffer: string[];
  row: number;
  col: number;
  content: string;
}): void {
  buffer.push(`\x1b[${row};${col}H${content}`);
}

export function truncateWithEllipsis(text: string, maxLen: number): string {
  return text.length > maxLen ? text.substring(0, maxLen - 1) + SYMBOLS.ellipsis : text;
}

export function chunkString(str: string, len: number): string[] {
  if (!str || len <= 0) return [];

  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += len) {
    chunks.push(str.slice(i, i + len));
  }
  return chunks;
}

export function wrapString(str: string, maxWidth: number): string[] {
  if (!str || maxWidth <= 0) return [];
  const words = str.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + word).length <= maxWidth) {
      currentLine += (currentLine === "" ? "" : " ") + word;
    } else {
      if (currentLine !== "") lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine !== "") lines.push(currentLine);
  return lines;
}

export function formatFooter(footerText: string): string {
  return footerText
    .replace(/\(([^)]+)\)/g, (_, chars) => colorize(`\x1b[4m${chars}\x1b[24m`, ANSI.highlight))
    .replace(/\|/g, colorize("|", ANSI.dim));
}
