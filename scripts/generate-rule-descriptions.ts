import { execSync } from "node:child_process";
import { rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import zlib from "node:zlib";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_URL = "https://github.com/oxc-project/oxc-project.github.io.git";
const RULES_REL_PATH = "src/docs/guide/usage/linter/rules";
const OUT_PATH = join(ROOT, "../src/oxlint/rule-descriptions.br");

const log = (msg: string, ...args: unknown[]) =>
  console.log(`[generate-rule-descriptions] ${msg}`, ...args);

function extractWhatItDoes(markdown: string): string {
  const md = markdown.replace(/\r/g, "");

  const ruleHeaderIndex = md.indexOf("<RuleHeader />");
  const mdAfterHeader = ruleHeaderIndex !== -1 ? md.slice(ruleHeaderIndex) : md;

  const headingRegex = /^#{3}\s*What it does\s*$/gim;
  const match = headingRegex.exec(mdAfterHeader);
  if (!match) return "";

  const startIndex = match.index + match[0].length;
  const rest = mdAfterHeader.slice(startIndex);
  const nextHeadingMatch = rest.match(/^#{3}\s*.*$/m);
  const endIndex = nextHeadingMatch ? nextHeadingMatch.index : rest.length;

  let section = rest.slice(0, endIndex).trim();

  section = section.replace(/```[\s\S]*?```/g, "");
  section = section.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  section = section.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  section = section.replace(/(^|\n)#{1,3}\s.*$/gim, "");
  section = section.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1");
  section = section.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");
  section = section.replace(/\n{2,}/g, "\n\n").trim();

  return section;
}

await (async function main() {
  const args = process.argv.slice(2);
  const cloneDirArg = args.find((a) => a.startsWith("--clone-dir="));
  const cloneDir = cloneDirArg
    ? cloneDirArg.split("=")[1]
    : join(tmpdir(), "oxc-project-site-temp-build");
  const skipClone = args.includes("--skip-clone");

  try {
    if (!skipClone) {
      if (existsSync(cloneDir)) rmSync(cloneDir, { recursive: true, force: true });
      log(`Cloning ${REPO_URL} (Sparse)...`);
      mkdirSync(cloneDir, { recursive: true });
      const opts = { cwd: cloneDir, stdio: "pipe" as const };

      execSync(`git init --quiet`, opts);
      execSync(`git remote add origin ${REPO_URL}`, opts);
      execSync(`git config core.sparseCheckout true`, opts);
      execSync(`git sparse-checkout set "${RULES_REL_PATH}"`, opts);
      execSync(`git pull --quiet --depth 1 origin main`, opts);
    }

    const targetDir = join(cloneDir, RULES_REL_PATH);
    const files = await readdir(targetDir, { recursive: true });
    const descriptions: Record<string, Record<string, string>> = {};

    await Promise.all(
      files
        .filter((f) => f.endsWith(".md"))
        .map(async (file) => {
          const parts = file.split(/[/\\]/);
          if (parts.length !== 2) return;

          const [plugin, fileName] = parts;
          const ruleName = fileName.replace(/\.md$/, "");
          const content = await readFile(join(targetDir, file), "utf8");
          const desc = extractWhatItDoes(content);

          if (!descriptions[plugin]) descriptions[plugin] = {};
          descriptions[plugin][ruleName] = desc;
        }),
    );

    const jsonString = JSON.stringify(descriptions);
    const compressed = zlib.brotliCompressSync(jsonString, {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      },
    });

    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, compressed);

    log(`Saved to ${OUT_PATH}. Plugins: ${Object.keys(descriptions).length}`);
    log(
      `Size: ${(Buffer.byteLength(jsonString) / 1024).toFixed(2)}KB -> ${(compressed.length / 1024).toFixed(2)}KB`,
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (!args.includes("--keep-temp") && existsSync(cloneDir)) {
      log(`Cleaning up: ${cloneDir}`);
      rmSync(cloneDir, { recursive: true, force: true });
    }
  }
})();
