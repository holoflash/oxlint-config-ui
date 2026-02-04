import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { platform } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export function loadDescriptions() {
  const compressedPath = path.join(__dirname, "rule-descriptions.br");
  if (fs.existsSync(compressedPath)) {
    return JSON.parse(zlib.brotliDecompressSync(fs.readFileSync(compressedPath)).toString());
  }
}
export function stripJsonComments(json: string): string {
  return json.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m));
}

export function openUrl(url: string | undefined): void {
  if (!url) return;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "explorer" : "xdg-open";
  const process = spawn(cmd, [url], {
    detached: true,
    stdio: "ignore",
  });
  process.unref();
}
