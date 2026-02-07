import { ANSI, SYMBOLS, LAYOUT } from "./constants.js";

export function colorize(text: string, color: string): string {
  return `${color}${text}${ANSI.reset}`;
}

export function writeAt(buffer: string[], row: number, col: number, content: string): void {
  buffer.push(`\x1b[${row};${col}H${content}`);
}

export function truncateWithEllipsis(text: string, maxLen: number): string {
  return text.length > maxLen ? text.substring(0, maxLen - 1) + SYMBOLS.ellipsis : text;
}

export function chunkString(str: string, len: number): string[] {
  if (!str) return [];
  const size = Math.ceil(str.length / len);
  const r = Array(size);
  for (let i = 0; i < size; i++) r[i] = str.substring(i * len, (i + 1) * len);
  return r;
}

export function calculateScrollThumb(
  totalItems: number,
  viewHeight: number,
  scrollOffset: number,
): { needsScrollbar: boolean; thumbStart: number; thumbEnd: number } {
  const needsScrollbar = totalItems > viewHeight;
  if (!needsScrollbar) return { needsScrollbar, thumbStart: 0, thumbEnd: 0 };

  const thumbSize = Math.max(1, Math.floor((viewHeight * viewHeight) / totalItems));
  const maxScroll = totalItems - viewHeight;
  const scrollRatio = maxScroll > 0 ? scrollOffset / maxScroll : 0;
  const thumbStart = Math.floor(scrollRatio * (viewHeight - thumbSize));

  return { needsScrollbar, thumbStart, thumbEnd: thumbStart + thumbSize };
}

export function calculateLayout(columns: number, rows: number) {
  const boxHeight = rows - LAYOUT.mainPaddingBottom;
  const categoriesWidth = Math.floor(columns * LAYOUT.columnWidths.categories);
  const rulesWidth = Math.floor(columns * LAYOUT.columnWidths.rules);
  const detailsWidth = columns - categoriesWidth - rulesWidth - LAYOUT.columnGap;
  const categoryListHeight = boxHeight - LAYOUT.statsHeight;

  return { boxHeight, categoriesWidth, rulesWidth, detailsWidth, categoryListHeight };
}
