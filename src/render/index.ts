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
  drawBox(
    buffer,
    1,
    1,
    categoriesWidth,
    categoryListHeight,
    LABELS.categories,
    state.categories,
    state.selectedCategoryIndex,
    state.categoryScroll,
    state.activePane === 0,
  );
  drawStats(buffer, 1, 1 + categoryListHeight, categoriesWidth, LAYOUT.statsHeight, rules);
  drawBox(
    buffer,
    categoriesWidth + 1,
    1,
    rulesWidth,
    boxHeight,
    `${LABELS.rules} (${rules.length})`,
    rules,
    state.selectedRuleIndex,
    state.ruleScroll,
    state.activePane === 1,
  );
  drawDetails(
    buffer,
    categoriesWidth + rulesWidth + 1,
    1,
    detailsWidth,
    boxHeight,
    rule,
    state.activePane === 2,
  );

  const msgColor = ANSI[state.messageType] || ANSI.reset;
  writeAt(
    buffer,
    rows - LAYOUT.messageRow,
    2,
    `${msgColor}${SYMBOLS.bullet} ${state.message}${ANSI.reset}`,
  );

  const footerConfig = state.configPath
    ? `${LABELS.configPrefix} ${state.configPath}`
    : LABELS.noConfig;
  writeAt(
    buffer,
    rows - LAYOUT.footerRow,
    2,
    colorize(`${LABELS.footer} | ${footerConfig}`, ANSI.dim),
  );

  stdout.write(buffer.join(""));
}
