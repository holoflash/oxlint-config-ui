import { stdout, exit } from "node:process";
import { spawn } from "node:child_process";
import { platform } from "node:process";
import type { Action, RuleStatus } from "../types.js";
import { render } from "../rendering/render.js";
import { runLint } from "../oxlint/linting.js";
import { calculateLayout, updateScroll } from "../rendering/layout.js";
import { PANES, ANSI } from "../config.js";
import { calculateNextIndex, skipDividers } from "./navigation-utils.js";
import {
  getState,
  setState,
  getCurrentCategoryRules,
  updateConfigRule,
  toggleInsights,
  setMessage,
  getCurrentCategory,
} from "../state.js";

function handleSetStatus(value: RuleStatus): void {
  const state = getState();
  const currentCategoryRules = getCurrentCategoryRules();

  if (state.activePane === PANES.CATEGORIES) {
    const category = getCurrentCategory();
    for (const rule of currentCategoryRules) {
      updateConfigRule(rule, value);
      rule.configStatus = value;
      rule.isActive = value === "error" || value === "warn";
    }

    setMessage(
      `All ${currentCategoryRules.length} rules in '${category}' set to: ${value}`,
      "info",
    );
  } else if (state.activePane === PANES.RULES) {
    const rule = currentCategoryRules[state.selectedRuleIndex];
    if (!rule) return;

    updateConfigRule(rule, value);
    rule.configStatus = value;
    rule.isActive = value === "error" || value === "warn";

    setMessage(`Rule '${rule.value}' set to: ${value}`, "info");
  }

  render();
}

function handleOpenDocs(): void {
  const state = getState();
  if (state.activePane !== PANES.RULES) return;

  const currentCategoryRules = getCurrentCategoryRules();
  const rule = currentCategoryRules[state.selectedRuleIndex];
  const docsUrl = rule.docs_url || rule.url;

  if (rule && docsUrl) {
    let cmd: string;
    let args: string[];

    if (platform === "win32") {
      cmd = "cmd.exe";
      args = ["/c", "start", '""', docsUrl];
    } else if (platform === "darwin") {
      cmd = "open";
      args = [docsUrl];
    } else {
      cmd = "xdg-open";
      args = [docsUrl];
    }

    const process = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    process.unref();
  }
}

function handleMoveVertical(direction: "up" | "down"): void {
  const state = getState();
  const { activePane, selectedCategoryIndex, selectedRuleIndex, categories } = state;

  if (state.showInsights) {
    return;
  }

  const currentCategoryRules = getCurrentCategoryRules();

  const layout = calculateLayout(stdout.columns, stdout.rows);

  if (activePane === PANES.CATEGORIES) {
    const maxIndex = categories.length - 1;
    const nextIndexRaw = calculateNextIndex(selectedCategoryIndex, maxIndex, direction);
    const nextIndex = skipDividers(categories, nextIndexRaw, maxIndex, direction);

    setState({
      ...state,
      selectedCategoryIndex: nextIndex,
      selectedRuleIndex: 0,
      ruleScroll: 0,
      categoryScroll: updateScroll(
        nextIndex,
        state.categoryScroll,
        layout.categories.viewportH,
        categories.length,
      ),
    });
  } else if (activePane === PANES.RULES) {
    const maxIndex = currentCategoryRules.length - 1;
    const nextIndex = calculateNextIndex(selectedRuleIndex, maxIndex, direction);

    setState({
      ...state,
      selectedRuleIndex: nextIndex,
      ruleScroll: updateScroll(
        nextIndex,
        state.ruleScroll,
        layout.rules.viewportH,
        currentCategoryRules.length,
      ),
    });
  }

  render();
}

function handleMoveHorizontal(direction: "left" | "right"): void {
  const state = getState();
  const { activePane } = state;

  if (direction === "right" && activePane !== PANES.DETAILS) {
    const nextPane = activePane === PANES.CATEGORIES ? PANES.RULES : PANES.DETAILS;
    setState({ ...state, activePane: nextPane });
    render();
  } else if (direction === "left" && activePane !== PANES.CATEGORIES) {
    const nextPane = activePane === PANES.DETAILS ? PANES.RULES : PANES.CATEGORIES;
    setState({ ...state, activePane: nextPane });
    render();
  }
}

export function executeAction(action: Action | null): void {
  if (!action) return;

  const state = getState();
  if (state.showInsights) {
    const allowedTypes: Action["type"][] = ["EXIT", "RUN_LINT", "RUN_ALL_RULES", "TOGGLE_INSIGHTS"];
    if (!allowedTypes.includes(action.type)) return;
  }

  switch (action.type) {
    case "EXIT":
      stdout.write(ANSI.restoreTerminal);
      exit(0);

    case "RUN_LINT":
      runLint();
      return;

    case "RUN_ALL_RULES":
      runLint({ isRunAll: true });
      return;

    case "RUN_SELECTED": {
      if (state.activePane === PANES.CATEGORIES) {
        const rules = getCurrentCategoryRules();
        if (rules.length > 0) {
          runLint({ rules });
        }
      } else if (state.activePane === PANES.RULES) {
        const currentCategoryRules = getCurrentCategoryRules();
        const rule = currentCategoryRules[state.selectedRuleIndex];
        if (rule) runLint({ rule });
      }
      return;
    }

    case "OPEN_DOCS":
      handleOpenDocs();
      return;

    case "SET_SEVERITY":
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

    case "TOGGLE_INSIGHTS": {
      if (!state.showInsights) {
        if (!state.insightsData) {
          runLint({ isRunAll: true });
        }
        toggleInsights(true);
      } else {
        toggleInsights(false);
      }
      render();
      return;
    }
  }
}
