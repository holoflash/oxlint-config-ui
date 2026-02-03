import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import zlib from "node:zlib"; // Import zlib

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_URL = "https://github.com/oxc-project/oxc-project.github.io.git";
const DEFAULT_CLONE_DIR = join(tmpdir(), "oxc-project-site-temp-build");

const RULES_GLOB_DIR = join("src", "docs", "guide", "usage", "linter", "rules");
const OUTPUT_DIR = join(__dirname, "../src");
const OUTPUT_FILE = join(OUTPUT_DIR, "rule-descriptions.br");

function log(...args: unknown[]) {
  console.log("[generate-rule-descriptions]", ...args);
}

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

function cloneOrUpdateRepo(cloneDir: string) {
  if (statSyncSafe(cloneDir)) {
    log(`Found existing temp repo at ${cloneDir}, attempting to update...`);
    try {
      execSync("git pull", { cwd: cloneDir, stdio: "inherit" });
    } catch {
      log("Failed to update repo, wiping and re-cloning...");
      rmSync(cloneDir, { recursive: true, force: true });
      ensureDir(dirname(cloneDir));
      execSync(`git clone --depth 1 ${REPO_URL} "${cloneDir}"`, { stdio: "inherit" });
    }
  } else {
    log(`Cloning ${REPO_URL} into temp dir ${cloneDir}...`);
    ensureDir(dirname(cloneDir));
    execSync(`git clone --depth 1 ${REPO_URL} "${cloneDir}"`, { stdio: "inherit" });
  }
}

function statSyncSafe(path: string) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function walkDir(dir: string, callback: (filePath: string) => void) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, callback);
    } else {
      callback(full);
    }
  }
}

function extractWhatItDoes(markdown: string) {
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

function buildDescriptionsFromRepo(baseDir: string) {
  const targetDir = join(baseDir, RULES_GLOB_DIR);
  const stats = statSyncSafe(targetDir);
  if (!stats) {
    throw new Error(`Rules directory not found in repo at ${targetDir}`);
  }

  const descriptions: Record<string, Record<string, string>> = {};

  walkDir(targetDir, (filePath) => {
    if (!filePath.endsWith(".md")) return;
    const rel = relative(targetDir, filePath);
    const parts = rel.split(/\/|\\/);
    if (parts.length !== 2) return;
    const [plugin, fileName] = parts;
    const ruleName = fileName.replace(/\.md$/, "");

    const content = readFileSync(filePath, "utf8");
    const desc = extractWhatItDoes(content);

    if (!descriptions[plugin]) descriptions[plugin] = {};
    descriptions[plugin][ruleName] = desc;
  });

  return descriptions;
}

function saveDescriptions(obj: Record<string, Record<string, string>>) {
  ensureDir(OUTPUT_DIR);

  const jsonString = JSON.stringify(obj);
  const originalSize = Buffer.byteLength(jsonString);

  const compressed = zlib.brotliCompressSync(jsonString, {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
    },
  });

  writeFileSync(OUTPUT_FILE, compressed);
  log(`Saved compressed descriptions to ${OUTPUT_FILE}`);
  log(`Size: ${(originalSize / 1024).toFixed(2)}KB -> ${(compressed.length / 1024).toFixed(2)}KB`);
}

await (async function main() {
  const args = process.argv.slice(2);
  const cloneDirArg = args.find((a) => a.startsWith("--clone-dir="));
  const cloneDir = cloneDirArg ? cloneDirArg.split("=")[1] : DEFAULT_CLONE_DIR;

  try {
    const skipClone = args.includes("--skip-clone");

    if (!skipClone) {
      cloneOrUpdateRepo(cloneDir);
    } else {
      log("--skip-clone provided; using existing repo at %s", cloneDir);
    }

    const descriptions = buildDescriptionsFromRepo(cloneDir);
    saveDescriptions(descriptions);

    log("Done. Total plugins:", Object.keys(descriptions).length);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    try {
      if (!args.includes("--keep-temp")) {
        log(`Cleaning up temporary directory: ${cloneDir}`);
        rmSync(cloneDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Failed to clean up temp dir:", e);
    }
  }
})();
