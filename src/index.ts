import { stdout } from "node:process";
import type { State } from "./types.js";
import { render } from "./rendering.js";
import { loadRules } from "./rules.js";
import { initializeState } from "./state.js";
import { setupKeyboardInput } from "./input.js";
import { enterAltScreen } from "./terminal.js";

export const OXLINT_VERSION = "1.42.0";
export const TSGOLINT_VERSION = "0.11.4";

function createInitialState(): State {
  return {
    activePane: 0,
    selectedCategoryIndex: 0,
    selectedRuleIndex: 0,
    categoryScroll: 0,
    ruleScroll: 0,
    isLintInProgress: false,
    message: "oxlint-tui",
    messageType: "dim",
    ...loadRules(),
  };
}

function main(): void {
  const initialState = createInitialState();
  initializeState(initialState);

  setupKeyboardInput();

  stdout.on("resize", render);

  enterAltScreen();
  render();
}

main();
