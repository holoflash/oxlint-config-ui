import { useMemo } from "react";
import type { OxlintConfig, RuleLevel } from "../types/oxlint";
import { RULES_BY_CATEGORY, type Rule } from "../rules";

const CATEGORY_ORDER = [
  "correctness",
  "pedantic",
  "perf",
  "restriction",
  "style",
  "suspicious",
  "nursery",
];

export function useActiveRules(config: OxlintConfig) {
  return useMemo(() => {
    const rulesList: { name: string; level: RuleLevel; category: string }[] =
      [];
    const categoryActiveCounts: Record<string, number> = {};

    CATEGORY_ORDER.forEach((categoryName) => {
      const categoryLevel =
        (config.categories?.[categoryName] as RuleLevel) || "off";
      const rulesInCategory: Rule[] = RULES_BY_CATEGORY[categoryName] || [];
      let activeCount = 0;

      rulesInCategory.forEach((rule) => {
        const ruleName = rule.name;

        const explicitRuleLevel =
          (config.rules?.[ruleName] as RuleLevel) || categoryLevel;

        if (explicitRuleLevel !== "off") {
          rulesList.push({
            name: ruleName,
            level: explicitRuleLevel,
            category: categoryName,
          });
          activeCount++;
        }
      });
      categoryActiveCounts[categoryName] = activeCount;
    });

    const sortOrder: Record<RuleLevel, number> = { error: 1, warn: 2, off: 3 };
    rulesList.sort((a, b) => {
      const levelDiff = sortOrder[a.level] - sortOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      return a.name.localeCompare(b.name);
    });

    return { activeRules: rulesList, categoryActiveCounts };
  }, [config.rules, config.categories]);
}
