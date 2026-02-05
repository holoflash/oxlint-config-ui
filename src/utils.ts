import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export function loadDescriptions() {
  const compressedPath = path.join(__dirname, "rule-descriptions.br");
  if (fs.existsSync(compressedPath)) {
    return JSON.parse(zlib.brotliDecompressSync(fs.readFileSync(compressedPath)).toString());
  }
}
