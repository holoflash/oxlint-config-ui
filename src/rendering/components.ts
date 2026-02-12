import type { OxlintRule, Rect } from "../types.js";
import { ANSI, BOX, LABELS, LAYOUT, DETAIL_FIELDS } from "./constants.js";
import { colorize, writeAt, chunkString, truncateWithEllipsis } from "./helpers.js";
import { calculateScrollThumb } from "./layout.js";

export function drawBoxFrame(
  buffer: string[],
  rect: Rect,
  title: string,
  borderColor: string,
  getScrollbarChar?: (rowIndex: number) => string,
): void {
  const { col, row, width, height } = rect;
  const innerHeight = height - LAYOUT.boxBorder;

  const titleClean = truncateWithEllipsis(title, width - LAYOUT.titlePadding);
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
      content: `${borderColor}${BOX.vertical}${" ".repeat(width - LAYOUT.boxBorder)}${rightChar}${ANSI.reset}`,
    });
  }

  writeAt({
    buffer,
    row: row + height - 1,
    col,
    content: `${borderColor}${BOX.bottomLeft}${BOX.horizontal.repeat(width - LAYOUT.boxBorder)}${BOX.bottomRight}${ANSI.reset}`,
  });
}

export function drawBox({
  buffer,
  items,
  selectedIndex,
  scrollOffset,
  isActive,
  title,
  ...rect
}: {
  buffer: string[];
  items: (OxlintRule | string)[];
  selectedIndex: number;
  scrollOffset: number;
  isActive: boolean;
  title: string;
} & Rect): void {
  const borderColor = isActive ? ANSI.borderActive : ANSI.borderInactive;
  const innerHeight = rect.height - LAYOUT.boxBorder;

  const { needsScrollbar, thumbStart, thumbEnd } = calculateScrollThumb(
    items.length,
    innerHeight,
    scrollOffset,
  );

  const getScrollbarChar = (i: number) =>
    needsScrollbar && i >= thumbStart && i < thumbEnd ? BOX.verticalThick : BOX.vertical;

  drawBoxFrame(buffer, rect, title, borderColor, getScrollbarChar);

  items.slice(scrollOffset, scrollOffset + innerHeight).forEach((item, i) => {
    const absoluteIndex = scrollOffset + i;
    const isRule = typeof item !== "string";
    const rawText = isRule ? (item.hits ? `${item.value} (${item.hits})` : item.value) : item;

    if (!isRule && rawText.startsWith("-")) {
      const label = rawText.replace(/-/g, "").trim();
      const innerWidth = rect.width - LAYOUT.boxBorder;
      const labelPart = `${BOX.horizontal} ${label} `;
      const remainingDashes = Math.max(0, innerWidth - labelPart.length);

      const rightChar =
        needsScrollbar && i >= thumbStart && i < thumbEnd ? BOX.rightTThick : BOX.rightT;

      const dividerLine = `${BOX.leftT}${labelPart}${BOX.horizontal.repeat(remainingDashes)}${rightChar}`;

      writeAt({
        buffer,
        row: rect.row + 1 + i,
        col: rect.col,
        content: `${borderColor}${dividerLine}${ANSI.reset}`,
      });
      return;
    }

    const display = truncateWithEllipsis(rawText, rect.width - LAYOUT.contentPadding).padEnd(
      rect.width - LAYOUT.contentPadding,
    );

    let itemColor: string = ANSI.dim;
    if (isRule) {
      if (item.configStatus === "error") itemColor = ANSI.error;
      else if (item.configStatus === "warn") itemColor = ANSI.warn;
      else if (item.isActive) itemColor = ANSI.success;
      if (item.hits && item.hits > 0) itemColor = ANSI.highlight;
    }

    writeAt({ buffer, row: rect.row + 1 + i, col: rect.col + 2, content: "" });

    if (absoluteIndex === selectedIndex) {
      buffer.push(
        isActive ? colorize(display, ANSI.selectedBg) : colorize(display, ANSI.dim + ANSI.inverse),
      );
    } else {
      buffer.push(colorize(display, itemColor));
    }
  });
}

export function drawStats({
  buffer,
  rules,
  ...rect
}: {
  buffer: string[];
  rules: OxlintRule[];
} & Rect): void {
  const innerHeight = rect.height - LAYOUT.boxBorder;
  drawBoxFrame(buffer, rect, LABELS.stats, ANSI.borderInactive);

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
      const labelStr = line.label.padEnd(rect.width - LAYOUT.statsLabelPadding);
      writeAt({
        buffer,
        row: rect.row + 1 + i,
        col: rect.col + 2,
        content: colorize(`${labelStr}${numStr}`, line.color),
      });
    }
  });
}

export function drawDetails({
  buffer,
  rule,
  isActive,
  ...rect
}: {
  buffer: string[];
  rule: OxlintRule | undefined;
  isActive: boolean;
} & Rect): void {
  const borderColor = isActive ? ANSI.borderActive : ANSI.borderInactive;
  const innerHeight = rect.height - LAYOUT.boxBorder;

  drawBoxFrame(buffer, rect, LABELS.details, borderColor);

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
        row: rect.row + 1 + line,
        col: rect.col + 2,
        content: `${colorize(lbl.padEnd(LAYOUT.labelWidth), ANSI.highlight)} ${val}`,
      });
      line++;
    }
  });

  if (line < innerHeight - 1) line++;
  if (line < innerHeight) {
    writeAt({ buffer, row: rect.row + 1 + line, col: rect.col + 2, content: LABELS.description });
    line++;

    const cleanDesc = (rule.description ?? LABELS.na).replace(/\s+/g, " ").trim();
    const chunks = chunkString(cleanDesc, rect.width - LAYOUT.descriptionPadding);

    chunks.forEach((chunk) => {
      if (line < innerHeight) {
        writeAt({
          buffer,
          row: rect.row + 1 + line,
          col: rect.col + 2,
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
      row: rect.row + 1 + footerLine,
      col: rect.col + 2,
      content: `Hit ${colorize("ENTER", ANSI.highlight)} to open docs`,
    });
  }
}
