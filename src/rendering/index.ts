import { stdout } from "node:process";
import { getState } from "../state.js";
import { ANSI, SYMBOLS, LABELS, LAYOUT } from "./constants.js";
import { colorize, writeAt, calculateLayout } from "./helpers.js";
import { drawBox, drawStats, drawDetails } from "./components.js";
export { ANSI } from "./constants.js";

export default function render(): void {
  const state = getState();
  if (!state || !state.categories) {
    return;
  }
  const { columns = 80, rows = 24 } = stdout;
  const { boxHeight, categoriesWidth, rulesWidth, detailsWidth, categoryListHeight } =
    calculateLayout(columns, rows);
  const currentCategory = state.categories[state.selectedCategoryIndex];
  const rules = state.rulesByCategory[currentCategory] || [];
  const rule = rules[state.selectedRuleIndex];
  const buffer = [ANSI.clearScreen];

  // CATEGORIES
  drawBox({
    buffer,
    col: 1,
    row: 1,
    width: categoriesWidth,
    height: categoryListHeight,
    title: LABELS.categories,
    items: state.categories,
    selectedIndex: state.selectedCategoryIndex,
    scrollOffset: state.categoryScroll,
    isActive: state.activePane === 0,
  });
  // TOGGLED STATS
  drawStats({
    buffer,
    col: 1,
    row: 1 + categoryListHeight,
    width: categoriesWidth,
    height: LAYOUT.statsHeight,
    rules,
  });
  // RULES
  drawBox({
    buffer,
    col: categoriesWidth + 1,
    row: 1,
    width: rulesWidth,
    height: boxHeight,
    title: `${LABELS.rules} (${rules.length})`,
    items: rules,
    selectedIndex: state.selectedRuleIndex,
    scrollOffset: state.ruleScroll,
    isActive: state.activePane === 1,
  });
  // RULE DETAILS
  drawDetails({
    buffer,
    col: categoriesWidth + rulesWidth + 1,
    row: 1,
    width: detailsWidth,
    height: boxHeight,
    rule,
    isActive: state.activePane === 2,
  });
  // MESSAGES
  const msgColor = ANSI[state.messageType] || ANSI.reset;
  writeAt({
    buffer,
    row: rows - LAYOUT.messageRow,
    col: 2,
    content: `${msgColor}${SYMBOLS.bullet} ${state.message}${ANSI.reset}`,
  });
  // CONTROLS
  const footerConfig = state.configPath
    ? `${LABELS.configPrefix} ${state.configPath}`
    : LABELS.noConfig;
  writeAt({
    buffer,
    row: rows - LAYOUT.footerRow,
    col: 2,
    content: colorize(`${LABELS.footer} | ${footerConfig}`, ANSI.dim),
  });

  stdout.write(buffer.join(""));
}
