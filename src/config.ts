export const PANES = {
  CATEGORIES: 0,
  RULES: 1,
  DETAILS: 2,
} as const;

export const DIMENSIONS = {
  BOX_BORDER: 2,
  CONTENT_PADDING: 4,
  DESCRIPTION_PADDING: 6,
  TOGGLED_LABEL_PADDING: 8,
  TITLE_PADDING: 6,
  LABEL_WIDTH: 12,
  MESSAGE_ROW_OFFSET: 3,
  FOOTER_ROW_OFFSET: 1,
  TOGGLED_HEIGHT: 5,
  MAIN_PADDING_BOTTOM: 5,
  COLUMN_GAP: 1,
} as const;

export const COLUMN_RATIOS = {
  CATEGORIES: 0.2,
  RULES: 0.3,
} as const;

export const SCROLL = {
  MIN_THUMB_SIZE: 1,
  INITIAL_OFFSET: 0,
} as const;

export const INSIGHTS = {
  PADDING: 2,
  TITLE_SPACING: 2,
  CATEGORY_LABEL_WIDTH: 20,
  PERCENTAGE_WIDTH: 4,
} as const;

export const DETAILS = {
  DESCRIPTION_WRAP_PADDING: 6,
  METADATA_SPACING: 1,
} as const;

export const INITIAL_STATE = {
  ACTIVE_PANE: PANES.CATEGORIES,
  SELECTED_CATEGORY_INDEX: 0,
  SELECTED_RULE_INDEX: 0,
  CATEGORY_SCROLL: 0,
  RULE_SCROLL: 0,
  IS_LINT_IN_PROGRESS: false,
  MESSAGE: "oxlint-tui",
  MESSAGE_TYPE: "dim" as const,
  SHOW_INSIGHTS: false,
  INSIGHTS_DATA: null,
  CONFIG_PATH: null,
} as const;

export const VERSIONS = {
  OXLINT: "1.56.0",
  TSGOLINT: "0.17.0",
} as const;

export const ANSI = {
  altScreenAndHideCursor: "\x1b[?1049h\x1b[?25l",
  restoreTerminal: "\x1b[?1049l\x1b[?25h",
  clearScreen: "\x1b[H\x1b[J",
  reset: "\x1b[0m",
  dim: "\x1b[38;5;242m",
  highlight: "\x1b[38;5;111m",
  selectedBg: "\x1b[48;5;24m\x1b[38;5;255m\x1b[1m",
  borderActive: "\x1b[38;5;111m",
  borderInactive: "\x1b[38;5;237m",
  error: "\x1b[38;5;203m",
  warn: "\x1b[38;5;215m",
  success: "\x1b[38;5;114m",
  info: "\x1b[38;5;75m",
  inverse: "\x1b[7m",
} as const;

export const BOX = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  verticalThick: "┃",
  leftT: "├",
  rightT: "┤",
  rightTThick: "┨",
} as const;

export const SYMBOLS = {
  ellipsis: "…",
  bullet: "●",
  barFull: "█",
} as const;

export const LABELS = {
  categories: "CATEGORIES",
  rules: "RULES",
  toggled: "TOGGLED",
  details: "DETAILS",
  insights: "INSIGHTS",
  description: "Description:",
  noConfig: "No config loaded",
  configPrefix: "Config:",
  na: "N/A",
  yes: "Yes",
  no: "No",
  error: "Error",
  warn: "Warn",
  off: "Off",
  footer: // Wrapping text in () highlights it in the footer
    "(Arrows): Navigate | (1-3): Toggle Severity | Run → (A)ll, (S)elected, (T)oggled | Show (I)nsights | Open (D)ocs | (Q)uit",
  footerInsights: "Run: (A)ll, (T)oggled | Hide (I)nsights | (Q)uit",
} as const;

export const DETAIL_FIELDS = [
  "Name",
  "Severity",
  "Category",
  "Scope",
  "Fix",
  "Default",
  "Type-aware",
] as const;
