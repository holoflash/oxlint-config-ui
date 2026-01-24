export type RuleStatus = "off" | "warn" | "error";

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
}

export type OxlintConfig = {
    rules?: Record<string, RuleStatus | [RuleStatus, ...any[]]>;
    categories?: Record<string, RuleStatus>;
    [key: string]: any;
}

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
}

export const COLORS = {
    reset: "\x1b[0m",
    dim: "\x1b[90m",
    highlight: "\x1b[38;5;110m",
    selectedBg: "\x1b[47m\x1b[30m",
    borderActive: "\x1b[36m",
    borderInactive: "\x1b[90m",
    error: "\x1b[31m",
    warn: "\x1b[33m",
    success: "\x1b[32m",
    info: "\x1b[34m",
} as const;

export type ActionType =
    | "MOVE_UP" | "MOVE_DOWN" | "MOVE_LEFT" | "MOVE_RIGHT"
    | "OPEN_DOCS" | "EXIT" | "RUN_LINT" | "RUN_SINGLE_RULE"
    | "SET_STATUS";

export type Action = {
    type: ActionType;
    value?: RuleStatus;
}