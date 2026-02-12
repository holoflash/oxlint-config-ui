import { stdout } from "node:process";
import { getState, setState } from "../state.js";
import { ANSI, SYMBOLS, LABELS } from "./constants.js";
import { colorize, writeAt } from "./helpers.js";
import { drawBox, drawStats, drawDetails } from "./components.js";
import { calculateLayout, updateScroll } from "./layout.js";
export { ANSI } from "./constants.js";

export function render(): void {
  const state = getState();
  if (!state?.categories) return;

  const layout = calculateLayout(stdout.columns, stdout.rows);
  const rules = state.rulesByCategory[state.categories[state.selectedCategoryIndex]];

  const ruleScroll = updateScroll(
    state.selectedRuleIndex,
    state.ruleScroll,
    layout.rules.viewportH,
    rules.length,
  );
  const catScroll = updateScroll(
    state.selectedCategoryIndex,
    state.categoryScroll,
    layout.categories.viewportH,
    state.categories.length,
  );

  if (ruleScroll !== state.ruleScroll || catScroll !== state.categoryScroll) {
    setState({ ...state, ruleScroll, categoryScroll: catScroll });
  }

  const buffer = [ANSI.clearScreen];

  drawBox({
    buffer,
    ...layout.categories,
    title: LABELS.categories,
    items: state.categories,
    selectedIndex: state.selectedCategoryIndex,
    scrollOffset: catScroll,
    isActive: state.activePane === 0,
  });

  drawStats({
    buffer,
    ...layout.stats,
    rules,
  });

  drawBox({
    buffer,
    ...layout.rules,
    title: `${LABELS.rules} (${rules.length})`,
    items: rules,
    selectedIndex: state.selectedRuleIndex,
    scrollOffset: ruleScroll,
    isActive: state.activePane === 1,
  });

  drawDetails({
    buffer,
    ...layout.details,
    rule: rules[state.selectedRuleIndex],
    isActive: state.activePane === 2,
  });

  writeAt({
    buffer,
    ...layout.messages,
    content: `${ANSI[state.messageType] || ANSI.reset}${SYMBOLS.bullet} ${state.message}${ANSI.reset}`,
  });

  writeAt({
    buffer,
    ...layout.footer,
    content: colorize(`${LABELS.footer} | ${state.configPath || LABELS.noConfig}`, ANSI.dim),
  });

  stdout.write(buffer.join(""));
}
