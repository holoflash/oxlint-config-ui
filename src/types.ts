import type { COLORS } from "./rendering.js";

export type RuleStatus = "off" | "warn" | "error";

export type RulesState = Pick<State, "categories" | "rulesByCategory" | "config" | "configPath">;

export type LintOptions = {
  rule?: OxlintRule | null;
  isRunAll?: boolean;
};

export type OxlintRule = {
  value: string;
  category: string;
  scope: string;
  fix?: string;
  default?: boolean;
  type_aware?: boolean;
  docs_url?: string;
  url?: string;
  configStatus: RuleStatus;
  isActive: boolean;
  description?: string;
  hits?: number;
};

export type OxlintConfig = {
  rules?: Record<string, RuleStatus | [RuleStatus, ...any[]]>;
  categories?: Record<string, RuleStatus>;
  [key: string]: any;
};

export type State = {
  activePane: number;
  selectedCategoryIndex: number;
  selectedRuleIndex: number;
  categoryScroll: number;
  ruleScroll: number;
  isLintInProgress: boolean;
  message: string;
  messageType: keyof typeof COLORS;
  categories: string[];
  rulesByCategory: Record<string, OxlintRule[]>;
  config: OxlintConfig;
  configPath: string | null;
};

export type ActionType =
  | "MOVE_UP"
  | "MOVE_DOWN"
  | "MOVE_LEFT"
  | "MOVE_RIGHT"
  | "OPEN_DOCS"
  | "EXIT"
  | "RUN_LINT"
  | "RUN_ALL_RULES"
  | "RUN_SINGLE_RULE"
  | "SET_STATUS";

export type Action = {
  type: ActionType;
  value?: RuleStatus;
};
