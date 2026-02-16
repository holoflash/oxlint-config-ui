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

export const LAYOUT = {
  boxBorder: 2,
  contentPadding: 4,
  descriptionPadding: 6,
  toggledLabelPadding: 8,
  titlePadding: 6,
  labelWidth: 12,
  messageRow: 3,
  footerRow: 1,
  toggledHeight: 5,
  mainPaddingBottom: 5,
  columnGap: 1,
  columnWidths: { categories: 0.2, rules: 0.3 },
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
