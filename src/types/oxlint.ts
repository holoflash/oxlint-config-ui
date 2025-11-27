export const CATEGORY_ORDER = [
  "correctness",
  "pedantic",
  "perf",
  "restriction",
  "style",
  "suspicious",
  "nursery",
];

export interface OxlintConfig {
  $schema?: string;
  categories?: Record<string, string>;
  rules?: Record<string, string>;
  [key: string]: any;
}

export type RuleLevel = "error" | "warn" | "off";
