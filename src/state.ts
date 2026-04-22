import fs from "node:fs";
import path from "node:path";
import type { State, OxlintRule, RuleStatus } from "./types.js";
import { loadRules } from "./oxlint/rules.js";
import { INITIAL_STATE, VERSIONS } from "./config.js";

function detectVersion(pkg: string, fallback: string): string {
  try {
    const pkgJsonPath = path.join(process.cwd(), "node_modules", pkg, "package.json");
    const { version } = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    return version;
  } catch {
    return fallback;
  }
}

let state: State = {
  oxlintVersion: VERSIONS.OXLINT,
  tsgolintVersion: VERSIONS.TSGOLINT,
  activePane: INITIAL_STATE.ACTIVE_PANE,
  selectedCategoryIndex: INITIAL_STATE.SELECTED_CATEGORY_INDEX,
  selectedRuleIndex: INITIAL_STATE.SELECTED_RULE_INDEX,
  categoryScroll: INITIAL_STATE.CATEGORY_SCROLL,
  ruleScroll: INITIAL_STATE.RULE_SCROLL,
  isLintInProgress: INITIAL_STATE.IS_LINT_IN_PROGRESS,
  message: INITIAL_STATE.MESSAGE,
  messageType: INITIAL_STATE.MESSAGE_TYPE,
  categories: [],
  rulesByCategory: {},
  config: {},
  configPath: INITIAL_STATE.CONFIG_PATH,
  showInsights: INITIAL_STATE.SHOW_INSIGHTS,
  insightsData: INITIAL_STATE.INSIGHTS_DATA,
};

export function initializeState(): void {
  state.oxlintVersion = detectVersion("oxlint", VERSIONS.OXLINT);
  state.tsgolintVersion = detectVersion("oxlint-tsgolint", VERSIONS.TSGOLINT);
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

export function toggleInsights(show?: boolean): void {
  state.showInsights = show ?? !state.showInsights;
}

export function setInsightsData(data: any): void {
  state.insightsData = data;
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
      return false;
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
      rule.scope === "oxc" || rule.scope === "eslint" ? ruleName : `${rule.scope}/${ruleName}`;

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
