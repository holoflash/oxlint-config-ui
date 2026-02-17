import { stdout } from "node:process";
import { getState, setState } from "../state.js";
import { ANSI, SYMBOLS, LABELS } from "../config.js";
import { colorize, writeAt, formatFooter } from "./helpers.js";
import { drawBox, drawToggled, drawDetails, drawInsightsView } from "./components.js";
import { calculateLayout, updateScroll } from "./layout.js";

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

  if (state.showInsights) {
    drawInsightsView({
      buffer,
      tuiBox: {
        col: 1,
        row: 1,
        width: stdout.columns,
        height: layout.rules.height,
      },
      insightsData: state.insightsData,
      rulesByCategory: state.rulesByCategory,
      categories: state.categories,
    });
  } else {
    drawBox({
      buffer,
      tuiBox: layout.categories,
      title: LABELS.categories,
      items: state.categories,
      selectedIndex: state.selectedCategoryIndex,
      scrollOffset: catScroll,
      isActive: state.activePane === 0,
    });

    drawToggled({
      buffer,
      tuiBox: layout.toggled,
      rules,
      isActive: state.activePane === 0,
    });

    drawBox({
      buffer,
      tuiBox: layout.rules,
      title: `${LABELS.rules} (${rules.length})`,
      items: rules,
      selectedIndex: state.selectedRuleIndex,
      scrollOffset: ruleScroll,
      isActive: state.activePane === 1,
    });

    drawDetails({
      buffer,
      tuiBox: layout.details,
      rule: rules[state.selectedRuleIndex],
      isActive: state.activePane === 2,
    });
  }

  writeAt({
    buffer,
    ...layout.messages,
    content: `${ANSI[state.messageType] || ANSI.reset}${SYMBOLS.bullet} ${state.message}${ANSI.reset}`,
  });

  const footerLabel = state.showInsights ? LABELS.footerInsights : LABELS.footer;

  writeAt({
    buffer,
    ...layout.footer,
    content: `${formatFooter(footerLabel)} ${colorize("| " + (state.configPath || LABELS.noConfig), ANSI.dim)}`,
  });

  stdout.write(buffer.join(""));
}
