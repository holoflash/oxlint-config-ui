import type { State, OxlintRule, RuleStatus } from "./types.js";

let state: State;

export function initializeState(initialState: State): void {
  state = initialState;
}

export function getState(): State {
  return state;
}

export function setState(newState: State): void {
  state = newState;
}

export function updateState(updates: Partial<State>): void {
  state = { ...state, ...updates };
}

export function setMessage(message: string, messageType: State["messageType"]): void {
  state.message = message;
  state.messageType = messageType;
}

export function setLintInProgress(inProgress: boolean): void {
  state.isLintInProgress = inProgress;
}

export function updateRuleHits(hitCounts: Record<string, number>): void {
  Object.keys(state.rulesByCategory).forEach((cat) => {
    state.rulesByCategory[cat].forEach((r) => {
      r.hits = 0;
    });
  });

  Object.entries(hitCounts).forEach(([code, count]) => {
    let ruleToUpdate: OxlintRule | undefined;
    Object.values(state.rulesByCategory).some((rules) => {
      ruleToUpdate = rules.find((r) => {
        if (code === r.value) return true;
        if (code === `${r.scope}/${r.value}`) return true;
        if (code === `${r.scope}(${r.value})`) return true;
        if (code.endsWith(`(${r.value})`)) return true;
        return false;
      });
      return !!ruleToUpdate;
    });
    if (ruleToUpdate) ruleToUpdate.hits = count;
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

export function getCurrentRule(): OxlintRule | undefined {
  return getCurrentCategoryRules()[state.selectedRuleIndex];
}
