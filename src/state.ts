import type { State, OxlintRule, RuleStatus } from "./types.js";
import { loadRules } from "./oxlint/rules.js";

let state: State = {
  oxlintVersion: "1.46.0",
  tsgolintVersion: "0.12.0",
  activePane: 0,
  selectedCategoryIndex: 0,
  selectedRuleIndex: 0,
  categoryScroll: 0,
  ruleScroll: 0,
  isLintInProgress: false,
  message: "oxlint-tui",
  messageType: "dim",
  categories: [],
  rulesByCategory: {},
  config: {},
  configPath: null,
};

export function initializeState(): void {
  state = { ...state, ...loadRules() };
}

export function getState(): State {
  return state;
}

export function setState(newState: State): void {
  state = newState;
}

export function setMessage(message: string, messageType: State["messageType"]): void {
  state.message = message;
  state.messageType = messageType;
}

export function setLintInProgress(inProgress: boolean): void {
  state.isLintInProgress = inProgress;
}

export function updateRuleHits(
  hitCounts: Record<string, number>,
  lintedRules?: OxlintRule[],
): void {
  if (lintedRules) {
    lintedRules.forEach((rule) => {
      rule.hits = 0;
    });
  } else {
    Object.keys(state.rulesByCategory).forEach((cat) => {
      state.rulesByCategory[cat].forEach((r) => {
        r.hits = 0;
      });
    });
  }

  Object.entries(hitCounts).forEach(([code, count]) => {
    Object.values(state.rulesByCategory).some((rules) => {
      const ruleToUpdate = rules.find((r) => {
        if (code === r.value) return true;
        if (code === `${r.scope}/${r.value}`) return true;
        if (code === `${r.scope}(${r.value})`) return true;
        if (code.endsWith(`(${r.value})`)) return true;
        return false;
      });
      if (ruleToUpdate) {
        ruleToUpdate.hits = count;
        return true;
      }
    });
    return false;
  });
}

export function updateConfigRule(rule: OxlintRule, newStatus: RuleStatus): void {
  if (!state.config) state.config = { rules: {} };
  if (!state.config.rules) state.config.rules = {};

  try {
    const ruleName = rule.value;
    const canonicalKey =
      rule.scope === "oxc2" || rule.scope === "eslint" ? ruleName : `${rule.scope}/${ruleName}`;

    const rules = state.config.rules;
    const existingKey = Object.keys(rules).find(
      (key) => key === canonicalKey || key === ruleName || key.endsWith(`/${ruleName}`),
    );
    const targetKey = existingKey || canonicalKey;

    rules[targetKey] = newStatus;
  } catch {
    setMessage("Failed to update internal state", "error");
  }
}

export function getCurrentCategory(): string {
  return state.categories[state.selectedCategoryIndex];
}

export function getCurrentCategoryRules(): OxlintRule[] {
  return state.rulesByCategory[getCurrentCategory()] || [];
}
