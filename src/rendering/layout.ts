import { LAYOUT } from "./constants.js";

export function calculateLayout(columns: number, rows: number) {
  const { columnWidths, columnGap, statsHeight, boxBorder, mainPaddingBottom } = LAYOUT;
  const totalHeight = rows - mainPaddingBottom;

  const catW = Math.floor(columns * columnWidths.categories);
  const rulesW = Math.floor(columns * columnWidths.rules);
  const detailsW = columns - catW - rulesW - columnGap;
  const catH = totalHeight - statsHeight;

  return {
    categories: { col: 1, row: 1, width: catW, height: catH, viewportH: catH - boxBorder },
    stats: { col: 1, row: 1 + catH, width: catW, height: statsHeight },
    rules: {
      col: catW + 1,
      row: 1,
      width: rulesW,
      height: totalHeight,
      viewportH: totalHeight - boxBorder,
    },
    details: { col: catW + rulesW + 1, row: 1, width: detailsW, height: totalHeight },
    messages: { col: 2, row: rows - LAYOUT.messageRow },
    footer: { col: 2, row: rows - LAYOUT.footerRow },
  };
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

export function updateScroll(
  index: number,
  currentScroll: number,
  viewHeight: number,
  totalItems: number,
): number {
  const maxScroll = Math.max(0, totalItems - viewHeight);
  let newScroll = Math.min(Math.max(0, currentScroll), maxScroll);

  if (index < newScroll) {
    newScroll = index;
  } else if (index >= newScroll + viewHeight) {
    newScroll = Math.min(index - viewHeight + 1, maxScroll);
  }

  return newScroll;
}
