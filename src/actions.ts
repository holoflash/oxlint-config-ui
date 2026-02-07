import { stdout, exit } from "node:process";
import type { Action, RuleStatus } from "./types.js";
import render from "./render/index.js";
import {
  getState,
  setState,
  getCurrentCategoryRules,
  updateConfigRule,
  getCurrentCategory,
} from "./state.js";
import { runLint } from "./linting.js";
import { spawn } from "node:child_process";
import { platform } from "node:process";

function handleSetStatus(value: RuleStatus): void {
  const state = getState();
  const currentCategoryRules = getCurrentCategoryRules();

  if (state.activePane === 0) {
    const category = getCurrentCategory();
    for (const rule of currentCategoryRules) {
      updateConfigRule(rule, value);
      rule.configStatus = value;
      rule.isActive = value === "error" || value === "warn";
    }

    setState({
      ...state,
      message: `All ${currentCategoryRules.length} rules in '${category}' set to: ${value}`,
      messageType: "info",
    });
  } else if (state.activePane === 1) {
    const rule = currentCategoryRules[state.selectedRuleIndex];
    if (!rule) return;

    updateConfigRule(rule, value);
    rule.configStatus = value;
    rule.isActive = value === "error" || value === "warn";

    setState({
      ...state,
      message: `Rule '${rule.value}' set to: ${value}`,
      messageType: "info",
    });
  }

  render();
}

function handleOpenDocs(): void {
  const state = getState();
  if (state.activePane !== 1) return;

  const currentCategoryRules = getCurrentCategoryRules();
  const rule = currentCategoryRules[state.selectedRuleIndex];
  const docsUrl = rule.docs_url || rule.url;

  if (rule) {
    if (!docsUrl) return;
    const cmd = platform === "darwin" ? "open" : platform === "win32" ? "explorer" : "xdg-open";
    const process = spawn(cmd, [docsUrl], {
      detached: true,
      stdio: "ignore",
    });
    process.unref();
  }
}

function isDivider(category: string): boolean {
  return category.startsWith("-");
}

function handleMoveVertical(direction: "up" | "down"): void {
  const state = getState();
  const { activePane, selectedCategoryIndex, selectedRuleIndex, categories } = state;
  const currentCategoryRules = getCurrentCategoryRules();

  const viewportHeight = stdout.rows - 8;
  const statsBoxHeight = 3;
  const categoryListHeight = viewportHeight - statsBoxHeight;

  if (activePane === 0) {
    const maxIndex = categories.length - 1;
    let nextIndex =
      direction === "up"
        ? selectedCategoryIndex === 0
          ? maxIndex
          : selectedCategoryIndex - 1
        : selectedCategoryIndex === maxIndex
          ? 0
          : selectedCategoryIndex + 1;

    while (isDivider(categories[nextIndex])) {
      nextIndex =
        direction === "up"
          ? nextIndex === 0
            ? maxIndex
            : nextIndex - 1
          : nextIndex === maxIndex
            ? 0
            : nextIndex + 1;
    }

    setState({
      ...state,
      selectedCategoryIndex: nextIndex,
      selectedRuleIndex: 0,
      ruleScroll: 0,
      categoryScroll: updateScroll(nextIndex, state.categoryScroll, categoryListHeight),
    });
  } else if (activePane === 1) {
    const maxIndex = currentCategoryRules.length - 1;
    const nextIndex =
      direction === "up"
        ? selectedRuleIndex === 0
          ? maxIndex
          : selectedRuleIndex - 1
        : selectedRuleIndex === maxIndex
          ? 0
          : selectedRuleIndex + 1;

    setState({
      ...state,
      selectedRuleIndex: nextIndex,
      ruleScroll: updateScroll(nextIndex, state.ruleScroll, viewportHeight),
    });
  }

  render();
}

function handleMoveHorizontal(direction: "left" | "right"): void {
  const state = getState();
  const { activePane } = state;

  if (direction === "right" && activePane !== 1) {
    setState({ ...state, activePane: activePane + 1 });
    render();
  } else if (direction === "left" && activePane !== 0) {
    setState({ ...state, activePane: activePane - 1 });
    render();
  }
}

function updateScroll(idx: number, currentScroll: number, viewHeight: number): number {
  if (idx < currentScroll) return idx;
  if (idx >= currentScroll + viewHeight) return idx - viewHeight + 1;
  return currentScroll;
}

export function executeAction(action: Action | null): void {
  if (!action) return;

  switch (action.type) {
    case "EXIT":
      stdout.write("\x1b[?1049l\x1b[?25h");
      exit(0);
      return;

    case "RUN_LINT":
      runLint();
      return;

    case "RUN_ALL_RULES":
      runLint({ isRunAll: true });
      return;

    case "RUN_SINGLE_RULE": {
      const currentCategoryRules = getCurrentCategoryRules();
      const state = getState();
      const rule = currentCategoryRules[state.selectedRuleIndex];
      if (rule) runLint({ rule });
      return;
    }

    case "OPEN_DOCS":
      handleOpenDocs();
      return;

    case "SET_STATUS":
      if (action.value) handleSetStatus(action.value);
      return;

    case "MOVE_UP":
      handleMoveVertical("up");
      return;

    case "MOVE_DOWN":
      handleMoveVertical("down");
      return;

    case "MOVE_LEFT":
      handleMoveHorizontal("left");
      return;

    case "MOVE_RIGHT":
      handleMoveHorizontal("right");
      return;
  }
}
