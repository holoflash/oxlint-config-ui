export const ANSI = {
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
} as const;

export const LABELS = {
  categories: "CATEGORIES",
  rules: "RULES",
  stats: "STATS",
  details: "DETAILS",
  description: "Description:",
  noConfig: "No config loaded",
  configPrefix: "Config:",
  na: "N/A",
  yes: "Yes",
  no: "No",
  error: "Error",
  warn: "Warn",
  off: "Off",
  footer: "Arrows/HJKL: Nav | 1-3: Status | R: Active | A: All | X: Rule | Enter: Docs | Q: Quit",
} as const;

export const LAYOUT = {
  boxBorder: 2,
  contentPadding: 4,
  descriptionPadding: 6,
  statsLabelPadding: 8,
  titlePadding: 6,
  labelWidth: 12,
  messageRow: 3,
  footerRow: 1,
  statsHeight: 6,
  mainPaddingBottom: 5,
  columnGap: 2,
  columnWidths: { categories: 0.2, rules: 0.3 },
} as const;

export const DETAIL_FIELDS = [
  "Name",
  "Status",
  "Category",
  "Scope",
  "Fix",
  "Default",
  "Type-aware",
] as const;
