import { stdout } from "node:process";
import type { State } from "./types.js";
import render, { ANSI } from "./render/index.js";
import { loadRules } from "./rules.js";
import { initializeState } from "./state.js";
import { setupKeyboardInput } from "./input.js";

export const OXLINT_VERSION = "1.43.0";
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

  stdout.write(ANSI.altScreenAndHideCursor);
  render();
}

main();
