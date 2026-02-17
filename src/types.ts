import type { PANES, ANSI } from "./config.js";

export type RuleStatus = "off" | "warn" | "error";

export type PaneId = (typeof PANES)[keyof typeof PANES];

export type LintOptions = {
  rule?: OxlintRule | null;
  rules?: OxlintRule[];
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
  oxlintVersion: string;
  tsgolintVersion: string;
  activePane: PaneId;
  selectedCategoryIndex: number;
  selectedRuleIndex: number;
  categoryScroll: number;
  ruleScroll: number;
  isLintInProgress: boolean;
  message: string;
  messageType: keyof typeof ANSI;
  categories: string[];
  rulesByCategory: Record<string, OxlintRule[]>;
  config: OxlintConfig;
  configPath: string | null;
  showInsights: boolean;
  insightsData: any;
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
  | "RUN_SELECTED"
  | "SET_SEVERITY"
  | "TOGGLE_INSIGHTS";

export type Action = {
  type: ActionType;
  value?: RuleStatus;
};

export type TuiBox = {
  col: number;
  row: number;
  width: number;
  height: number;
  viewportH?: number;
};
