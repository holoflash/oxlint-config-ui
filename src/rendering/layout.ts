import { DIMENSIONS, COLUMN_RATIOS, SCROLL } from "../config.js";

export function calculateLayout(columns: number, rows: number) {
  const totalHeight = rows - DIMENSIONS.MAIN_PADDING_BOTTOM;

  const categoriesWidth = Math.floor(columns * COLUMN_RATIOS.CATEGORIES);
  const rulesWidth = Math.floor(columns * COLUMN_RATIOS.RULES);

  const detailsWidth = columns - categoriesWidth - rulesWidth - DIMENSIONS.COLUMN_GAP * 2;
  const categoriesHeight = totalHeight - DIMENSIONS.TOGGLED_HEIGHT;

  const rulesCol = categoriesWidth + DIMENSIONS.COLUMN_GAP + 1;
  const detailsCol = rulesCol + rulesWidth + DIMENSIONS.COLUMN_GAP;

  return {
    categories: {
      col: 1,
      row: 1,
      width: categoriesWidth,
      height: categoriesHeight,
      viewportH: categoriesHeight - DIMENSIONS.BOX_BORDER,
    },
    toggled: {
      col: 1,
      row: 1 + categoriesHeight,
      width: categoriesWidth,
      height: DIMENSIONS.TOGGLED_HEIGHT,
    },
    rules: {
      col: rulesCol,
      row: 1,
      width: rulesWidth,
      height: totalHeight,
      viewportH: totalHeight - DIMENSIONS.BOX_BORDER,
    },
    details: { col: detailsCol, row: 1, width: detailsWidth, height: totalHeight },
    messages: { col: 2, row: rows - DIMENSIONS.MESSAGE_ROW_OFFSET },
    footer: { col: 2, row: rows - DIMENSIONS.FOOTER_ROW_OFFSET },
  };
}

export function calculateScrollThumb(
  totalItems: number,
  viewHeight: number,
  scrollOffset: number,
): { needsScrollbar: boolean; thumbStart: number; thumbEnd: number } {
  const needsScrollbar = totalItems > viewHeight;
  if (!needsScrollbar) return { needsScrollbar, thumbStart: 0, thumbEnd: 0 };

  const thumbSize = Math.max(
    SCROLL.MIN_THUMB_SIZE,
    Math.floor((viewHeight * viewHeight) / totalItems),
  );
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
