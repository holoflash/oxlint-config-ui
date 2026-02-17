import type { OxlintRule, TuiBox } from "../types.js";
import { ANSI, BOX, LABELS, DETAIL_FIELDS, DIMENSIONS, INSIGHTS, DETAILS } from "../config.js";
import { colorize, writeAt, truncateWithEllipsis, wrapString } from "./helpers.js";
import { calculateScrollThumb } from "./layout.js";
import {
  buildRuleToGroupsMap,
  calculateCategoryCounts,
  sortCategoriesByCount,
  calculateFixabilityStats,
} from "./insights-utils.js";

export function drawBoxFrame(
  buffer: string[],
  tuiBox: TuiBox,
  title: string,
  borderColor: string,
  getScrollbarChar?: (rowIndex: number) => string,
): void {
  const { col, row, width, height } = tuiBox;
  const innerHeight = height - DIMENSIONS.BOX_BORDER;

  const titleClean = truncateWithEllipsis(title, width - DIMENSIONS.TITLE_PADDING);
  const topBorder = `${borderColor}${BOX.topLeft}${BOX.horizontal} ${titleClean} `.padEnd(
    width + borderColor.length - 1,
    BOX.horizontal,
  );

  writeAt({ buffer, row, col, content: `${topBorder}${BOX.topRight}${ANSI.reset}` });

  for (let i = 1; i <= innerHeight; i++) {
    const rightChar = getScrollbarChar ? getScrollbarChar(i - 1) : BOX.vertical;
    writeAt({
      buffer,
      row: row + i,
      col,
      content: `${borderColor}${BOX.vertical}${" ".repeat(width - DIMENSIONS.BOX_BORDER)}${rightChar}${ANSI.reset}`,
    });
  }

  writeAt({
    buffer,
    row: row + height - 1,
    col,
    content: `${borderColor}${BOX.bottomLeft}${BOX.horizontal.repeat(width - DIMENSIONS.BOX_BORDER)}${BOX.bottomRight}${ANSI.reset}`,
  });
}

export function drawBox({
  buffer,
  items,
  selectedIndex,
  scrollOffset,
  isActive,
  title,
  tuiBox,
}: {
  buffer: string[];
  items: (OxlintRule | string)[];
  selectedIndex: number;
  scrollOffset: number;
  isActive: boolean;
  title: string;
  tuiBox: TuiBox;
}): void {
  const borderColor = isActive ? ANSI.borderActive : ANSI.borderInactive;
  const innerHeight = tuiBox.height - DIMENSIONS.BOX_BORDER;

  const { needsScrollbar, thumbStart, thumbEnd } = calculateScrollThumb(
    items.length,
    innerHeight,
    scrollOffset,
  );

  const getScrollbarChar = (i: number) =>
    needsScrollbar && i >= thumbStart && i < thumbEnd ? BOX.verticalThick : BOX.vertical;

  drawBoxFrame(buffer, tuiBox, title, borderColor, getScrollbarChar);

  items.slice(scrollOffset, scrollOffset + innerHeight).forEach((item, i) => {
    const absoluteIndex = scrollOffset + i;
    const isRule = typeof item !== "string";
    const rawText = isRule ? (item.hits ? `${item.value} (${item.hits})` : item.value) : item;

    if (!isRule && rawText.startsWith("-")) {
      const label = rawText.replace(/-/g, "").trim();
      const innerWidth = tuiBox.width - DIMENSIONS.BOX_BORDER;
      const labelPart = `${BOX.horizontal} ${label} `;
      const remainingDashes = Math.max(0, innerWidth - labelPart.length);

      const rightChar =
        needsScrollbar && i >= thumbStart && i < thumbEnd ? BOX.rightTThick : BOX.rightT;

      const dividerLine = `${BOX.leftT}${labelPart}${BOX.horizontal.repeat(remainingDashes)}${rightChar}`;

      writeAt({
        buffer,
        row: tuiBox.row + 1 + i,
        col: tuiBox.col,
        content: `${borderColor}${dividerLine}${ANSI.reset}`,
      });
      return;
    }

    const display = truncateWithEllipsis(rawText, tuiBox.width - DIMENSIONS.CONTENT_PADDING).padEnd(
      tuiBox.width - DIMENSIONS.CONTENT_PADDING,
    );

    let itemColor: string = ANSI.dim;
    if (isRule) {
      if (item.configStatus === "error") itemColor = ANSI.error;
      else if (item.configStatus === "warn") itemColor = ANSI.warn;
      else if (item.isActive) itemColor = ANSI.success;
      if (item.hits && item.hits > 0) itemColor = ANSI.highlight;
    }

    writeAt({ buffer, row: tuiBox.row + 1 + i, col: tuiBox.col + 2, content: "" });

    if (absoluteIndex === selectedIndex) {
      buffer.push(
        isActive ? colorize(display, ANSI.selectedBg) : colorize(display, ANSI.dim + ANSI.inverse),
      );
    } else {
      buffer.push(colorize(display, itemColor));
    }
  });
}

export function drawToggled({
  buffer,
  rules,
  tuiBox,
  isActive,
}: {
  buffer: string[];
  rules: OxlintRule[];
  tuiBox: TuiBox;
  isActive: boolean;
}): void {
  const innerHeight = tuiBox.height - DIMENSIONS.BOX_BORDER;
  const borderColor = isActive ? ANSI.borderActive : ANSI.borderInactive;
  drawBoxFrame(buffer, tuiBox, LABELS.toggled, borderColor);

  const counts = { error: 0, warn: 0, off: 0 };
  rules.forEach((r) => {
    if (r.configStatus === "error") counts.error++;
    else if (r.configStatus === "warn") counts.warn++;
    else counts.off++;
  });

  const lines = [
    { label: LABELS.error, count: counts.error, color: ANSI.error },
    { label: LABELS.warn, count: counts.warn, color: ANSI.warn },
    { label: LABELS.off, count: counts.off, color: ANSI.dim },
  ];

  lines.forEach((line, i) => {
    if (i < innerHeight) {
      const numStr = String(line.count).padStart(3);
      const labelStr = line.label.padEnd(tuiBox.width - DIMENSIONS.TOGGLED_LABEL_PADDING);
      writeAt({
        buffer,
        row: tuiBox.row + 1 + i,
        col: tuiBox.col + 2,
        content: colorize(`${labelStr}${numStr}`, line.color),
      });
    }
  });
}

export function drawDetails({
  buffer,
  rule,
  isActive,
  tuiBox,
}: {
  buffer: string[];
  rule: OxlintRule | undefined;
  isActive: boolean;
  tuiBox: TuiBox;
}): void {
  const borderColor = isActive ? ANSI.borderActive : ANSI.borderInactive;
  const innerHeight = tuiBox.height - DIMENSIONS.BOX_BORDER;

  drawBoxFrame(buffer, tuiBox, LABELS.details, borderColor);

  if (!rule) return;

  const statusColor =
    rule.configStatus === "error"
      ? ANSI.error
      : rule.configStatus === "warn"
        ? ANSI.warn
        : ANSI.dim;

  const metadata: [string, string][] = [
    [DETAIL_FIELDS[0], rule.value],
    [DETAIL_FIELDS[1], colorize(rule.configStatus.toUpperCase(), statusColor)],
    [DETAIL_FIELDS[2], rule.category],
    [DETAIL_FIELDS[3], rule.scope],
    [DETAIL_FIELDS[4], rule.fix || LABELS.na],
    [DETAIL_FIELDS[5], rule.default ? LABELS.yes : LABELS.no],
    [DETAIL_FIELDS[6], rule.type_aware ? LABELS.yes : LABELS.no],
  ];

  let line = 0;

  metadata.forEach(([lbl, val]) => {
    if (line < innerHeight) {
      writeAt({
        buffer,
        row: tuiBox.row + 1 + line,
        col: tuiBox.col + 2,
        content: `${colorize(lbl.padEnd(DIMENSIONS.LABEL_WIDTH), ANSI.highlight)} ${val}`,
      });
      line++;
    }
  });

  if (line < innerHeight - 1) line++;
  if (line < innerHeight) {
    writeAt({
      buffer,
      row: tuiBox.row + 1 + line,
      col: tuiBox.col + 2,
      content: LABELS.description,
    });
    line++;

    const cleanDesc = (rule.description ?? LABELS.na).replace(/\s+/g, " ").trim();
    const chunks = wrapString(cleanDesc, tuiBox.width - DETAILS.DESCRIPTION_WRAP_PADDING);

    chunks.forEach((chunk) => {
      if (line < innerHeight) {
        writeAt({
          buffer,
          row: tuiBox.row + 1 + line,
          col: tuiBox.col + 2,
          content: colorize(chunk, ANSI.dim),
        });
        line++;
      }
    });
  }

  const footerLine = Math.max(line + 1, innerHeight - 1);
  if (footerLine < innerHeight + 1) {
    writeAt({
      buffer,
      row: tuiBox.row + 1 + footerLine,
      col: tuiBox.col + 2,
      content: `Hit ${colorize("ENTER", ANSI.highlight)} to open docs`,
    });
  }
}

export function drawInsightsView({
  buffer,
  tuiBox,
  insightsData,
  rulesByCategory,
  categories,
}: {
  buffer: string[];
  tuiBox: TuiBox;
  insightsData: any[];
  rulesByCategory: Record<string, OxlintRule[]>;
  categories: string[];
}): void {
  drawBoxFrame(buffer, tuiBox, LABELS.insights, ANSI.highlight);

  const innerHeight = tuiBox.height - DIMENSIONS.BOX_BORDER;
  let currentRow = tuiBox.row + INSIGHTS.TITLE_SPACING;
  const padding = INSIGHTS.PADDING;

  if (!insightsData) {
    writeAt({
      buffer,
      row: tuiBox.row + 2,
      col: tuiBox.col + 2,
      content: colorize("Generating Insights...", ANSI.highlight),
    });
    return;
  }

  const rulesToGroups = buildRuleToGroupsMap(rulesByCategory);

  const categoryCounts = calculateCategoryCounts(insightsData, rulesToGroups);
  const sortedCategories = sortCategoriesByCount(categories, categoryCounts);

  if (sortedCategories.length === 0) {
    writeAt({
      buffer,
      row: tuiBox.row + 2,
      col: tuiBox.col + 2,
      content: colorize("No rule violations found!", ANSI.success),
    });
    return;
  }

  const totalViolations = insightsData.length;

  writeAt({
    buffer,
    row: currentRow,
    col: tuiBox.col + padding,
    content: `${colorize("Violations by Category", ANSI.highlight)} ${colorize(`(${totalViolations} total)`, ANSI.dim)}`,
  });
  currentRow += INSIGHTS.TITLE_SPACING;

  const fixStats = calculateFixabilityStats(insightsData, rulesByCategory);
  const fixablePercent = ((fixStats.fixable / totalViolations) * 100).toFixed(1);
  const notFixablePercent = ((fixStats.notFixable / totalViolations) * 100).toFixed(1);

  const rightColStart = tuiBox.col + padding + 40;
  writeAt({
    buffer,
    row: currentRow - INSIGHTS.TITLE_SPACING,
    col: rightColStart,
    content: colorize("Fixability", ANSI.highlight),
  });

  writeAt({
    buffer,
    row: currentRow,
    col: rightColStart,
    content: `${"Auto-fixable".padEnd(15)} ${colorize(`${fixStats.fixable}`.padStart(4), ANSI.success)} ${colorize(`${fixablePercent}%`.padStart(4), ANSI.dim)}`,
  });

  writeAt({
    buffer,
    row: currentRow + 1,
    col: rightColStart,
    content: `${"Manual fix".padEnd(15)} ${colorize(`${fixStats.notFixable}`.padStart(4), ANSI.warn)} ${colorize(`${notFixablePercent}%`.padStart(4), ANSI.dim)}`,
  });

  sortedCategories.forEach((item, index) => {
    const row = currentRow + index;
    if (row < tuiBox.row + innerHeight - 1) {
      const percentage = ((item.count / totalViolations) * 100).toFixed(1);

      const label = item.name.padEnd(INSIGHTS.CATEGORY_LABEL_WIDTH);
      const countStr = item.count.toString().padStart(7);
      const percentStr = percentage.padStart(4) + "%";

      writeAt({
        buffer,
        row,
        col: tuiBox.col + padding,
        content: `${label} ${colorize(countStr, ANSI.highlight)} ${colorize(percentStr, ANSI.dim)}`,
      });
    }
  });
}
