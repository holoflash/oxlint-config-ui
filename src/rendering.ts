import { state } from "./index.js";
import type { OxlintRule } from "./types.js";
import { stdout } from "node:process";

export const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[38;5;242m",
  highlight: "\x1b[38;5;111m",
  selectedBg: "\x1b[48;5;24m\x1b[38;5;255m\x1b[1m",
  borderActive: "\x1b[38;5;111m",
  borderInactive: "\x1b[38;5;237m",
  error: "\x1b[38;5;203m",
  warn: "\x1b[38;5;215m",
  success: "\x1b[38;5;114m",
  info: "\x1b[38;5;75m",
} as const;

function chunkString(str: string, len: number): string[] {
  if (!str) return [];
  const size = Math.ceil(str.length / len);
  const r = Array(size);
  for (let i = 0; i < size; i++) r[i] = str.substring(i * len, (i + 1) * len);
  return r;
}

function drawBox(
  buffer: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  items: (OxlintRule | string)[],
  selectedIndex: number,
  scrollOffset: number,
  isActive: boolean,
): void {
  const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;
  const titleClean = title.length > width - 6 ? title.substring(0, width - 7) + "…" : title;
  const topBorder = `${borderColor}┌─ ${titleClean} `.padEnd(width + borderColor.length - 1, "─");
  buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);

  for (let i = 1; i < height - 1; i++) {
    buffer.push(`\x1b[${y + i};${x}H${borderColor}│${" ".repeat(width - 2)}│${COLORS.reset}`);
  }
  buffer.push(
    `\x1b[${y + height - 1};${x}H${borderColor}└${"─".repeat(width - 2)}┘${COLORS.reset}`,
  );

  const innerHeight = height - 2;
  items.slice(scrollOffset, scrollOffset + innerHeight).forEach((item, i) => {
    const absoluteIndex = scrollOffset + i;
    const isRule = typeof item !== "string";
    const rawText = isRule ? item.value : item;

    let display =
      rawText.length > width - 4
        ? rawText.substring(0, width - 5) + "…"
        : rawText.padEnd(width - 4);

    let itemColor: string = COLORS.dim;
    if (isRule) {
      const ruleItem = item;
      if (ruleItem.configStatus === "error") itemColor = COLORS.error;
      else if (ruleItem.configStatus === "warn") itemColor = COLORS.warn;
      else if (ruleItem.isActive) itemColor = COLORS.success;
    }

    buffer.push(`\x1b[${y + 1 + i};${x + 2}H`);
    if (absoluteIndex === selectedIndex) {
      buffer.push(
        isActive
          ? `${COLORS.selectedBg}${display}${COLORS.reset}`
          : `${COLORS.dim}\x1b[7m${display}${COLORS.reset}`,
      );
    } else {
      buffer.push(`${itemColor}${display}${COLORS.reset}`);
    }
  });
}

function drawStats(
  buffer: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  rules: OxlintRule[],
): void {
  const borderColor = COLORS.borderInactive;
  const topBorder = `${borderColor}┌─ STATS `.padEnd(width + borderColor.length - 1, "─");
  buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);
  for (let i = 1; i < height - 1; i++)
    buffer.push(`\x1b[${y + i};${x}H${borderColor}│${" ".repeat(width - 2)}│${COLORS.reset}`);
  buffer.push(
    `\x1b[${y + height - 1};${x}H${borderColor}└${"─".repeat(width - 2)}┘${COLORS.reset}`,
  );

  let counts = { error: 0, warn: 0, off: 0 };
  rules.forEach((ruleItem) => {
    if (ruleItem.configStatus === "error") counts.error++;
    else if (ruleItem.configStatus === "warn") counts.warn++;
    else counts.off++;
  });

  const lines = [
    { label: "Error", count: counts.error, color: COLORS.error },
    { label: "Warn", count: counts.warn, color: COLORS.warn },
    { label: "Off", count: counts.off, color: COLORS.dim },
  ];

  lines.forEach((line, i) => {
    if (i < height - 2) {
      const numStr = String(line.count).padStart(3);
      const labelStr = line.label.padEnd(width - 8);
      buffer.push(`\x1b[${y + 1 + i};${x + 2}H${line.color}${labelStr}${numStr}${COLORS.reset}`);
    }
  });
}

function drawDetails(
  buffer: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  rule: OxlintRule | undefined,
  isActive: boolean,
): void {
  const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;
  const topBorder = `${borderColor}┌─ DETAILS `.padEnd(width + borderColor.length - 1, "─");
  buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);
  for (let i = 1; i < height - 1; i++)
    buffer.push(`\x1b[${y + i};${x}H${borderColor}│${" ".repeat(width - 2)}│${COLORS.reset}`);
  buffer.push(
    `\x1b[${y + height - 1};${x}H${borderColor}└${"─".repeat(width - 2)}┘${COLORS.reset}`,
  );

  if (!rule) return;

  let statusDisplay = rule.configStatus.toUpperCase();
  if (rule.configStatus === "error")
    statusDisplay = `${COLORS.error}${statusDisplay}${COLORS.reset}`;
  else if (rule.configStatus === "warn")
    statusDisplay = `${COLORS.warn}${statusDisplay}${COLORS.reset}`;
  else statusDisplay = `${COLORS.dim}${statusDisplay}${COLORS.reset}`;

  const metadata: [string, string][] = [
    ["Name", rule.value],
    ["Status", statusDisplay],
    ["Category", rule.category],
    ["Scope", rule.scope],
    ["Fix", rule.fix || "N/A"],
    ["Default", rule.default ? "Yes" : "No"],
    ["Type-aware", rule.type_aware ? "Yes" : "No"],
  ];

  let line = 0;

  metadata.forEach(([lbl, val]) => {
    if (line < height - 2) {
      buffer.push(
        `\x1b[${y + 1 + line};${x + 2}H${COLORS.highlight}${lbl.padEnd(12)} ${COLORS.reset}${val}`,
      );
      line++;
    }
  });

  if (line < height - 3) line++;
  if (line < height - 2) {
    buffer.push(`\x1b[${y + 1 + line};${x + 2}H${COLORS.reset}Description:${COLORS.reset}`);
    line++;

    const cleanDesc = (rule.description ?? "N/A").replace(/\s+/g, " ").trim();
    const chunks = chunkString(cleanDesc, width - 6);

    chunks.forEach((chunk) => {
      if (line < height - 2) {
        buffer.push(`\x1b[${y + 1 + line};${x + 2}H${COLORS.dim}${chunk}${COLORS.reset}`);
        line++;
      }
    });
  }

  const footerLine = Math.max(line + 1, height - 3);

  if (footerLine < height - 1) {
    buffer.push(
      `\x1b[${y + 1 + footerLine};${x + 2}HHit ${COLORS.highlight}ENTER${COLORS.reset} to open docs`,
    );
  }
}

export function render(): void {
  if (!state || !state.categories) {
    return;
  }
  const { columns = 80, rows = 24 } = stdout;
  const currentCategory = state.categories[state.selectedCategoryIndex];
  const rules = state.rulesByCategory[currentCategory] || [];
  const rule = rules[state.selectedRuleIndex];
  const boxHeight = rows - 5;
  const categoriesColumnWidth = Math.floor(columns * 0.2);
  const rulesColumnWidth = Math.floor(columns * 0.3);
  const detailsColumnWidth = columns - categoriesColumnWidth - rulesColumnWidth - 2;
  const statsHeight = 6;
  const categoryListHeight = boxHeight - statsHeight;

  const buffer = ["\x1b[H\x1b[J"];
  drawBox(
    buffer,
    1,
    1,
    categoriesColumnWidth,
    categoryListHeight,
    "CATEGORIES",
    state.categories,
    state.selectedCategoryIndex,
    state.categoryScroll,
    state.activePane === 0,
  );
  drawStats(buffer, 1, 1 + categoryListHeight, categoriesColumnWidth, statsHeight, rules);
  drawBox(
    buffer,
    categoriesColumnWidth + 1,
    1,
    rulesColumnWidth,
    boxHeight,
    `RULES (${rules.length})`,
    rules,
    state.selectedRuleIndex,
    state.ruleScroll,
    state.activePane === 1,
  );
  drawDetails(
    buffer,
    categoriesColumnWidth + rulesColumnWidth + 1,
    1,
    detailsColumnWidth,
    boxHeight,
    rule,
    state.activePane === 2,
  );

  const msgColor = COLORS[state.messageType] || COLORS.reset;
  buffer.push(`\x1b[${rows - 3};2H${msgColor}● ${state.message}${COLORS.reset}`);

  const footerConfig = state.configPath ? `Config: ${state.configPath}` : "No config loaded";
  buffer.push(
    `\x1b[${rows - 1};2H${COLORS.dim}Arrows/HJKL: Nav | 1-3: Status | R: Lint | X: Run rule | Enter: Docs | Q: Quit | ${footerConfig}${COLORS.reset}`,
  );

  stdout.write(buffer.join(""));
}
