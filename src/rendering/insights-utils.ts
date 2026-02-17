import type { OxlintRule } from "../types.js";

export function buildRuleToGroupsMap(
  rulesByCategory: Record<string, OxlintRule[]>,
): Record<string, Set<string>> {
  const rulesToGroups: Record<string, Set<string>> = {};

  Object.entries(rulesByCategory).forEach(([groupName, rules]) => {
    rules.forEach((rule) => {
      if (!rulesToGroups[rule.value]) rulesToGroups[rule.value] = new Set();
      rulesToGroups[rule.value].add(groupName);

      if (rule.scope) {
        const fullCode = `${rule.scope}/${rule.value}`;
        if (!rulesToGroups[fullCode]) rulesToGroups[fullCode] = new Set();
        rulesToGroups[fullCode].add(groupName);

        const scopeCode = `${rule.scope}(${rule.value})`;
        if (!rulesToGroups[scopeCode]) rulesToGroups[scopeCode] = new Set();
        rulesToGroups[scopeCode].add(groupName);
      }
    });
  });

  return rulesToGroups;
}

export function calculateCategoryCounts(
  insightsData: any[],
  rulesToGroups: Record<string, Set<string>>,
): Record<string, number> {
  const categoryCounts: Record<string, number> = {};

  insightsData.forEach((diagnostic) => {
    const code = diagnostic.code;
    const rulePart = code.includes("(") ? code.split("(")[1].split(")")[0] : code;
    const groups = rulesToGroups[code] || rulesToGroups[rulePart] || new Set();

    groups.forEach((group) => {
      categoryCounts[group] = (categoryCounts[group] || 0) + 1;
    });
  });

  return categoryCounts;
}

export function sortCategoriesByCount(
  categories: string[],
  categoryCounts: Record<string, number>,
): Array<{ name: string; count: number }> {
  return categories
    .filter((category) => !category.startsWith("-"))
    .map((category) => ({
      name: category,
      count: categoryCounts[category] || 0,
    }))
    .filter((item) => item.count > 0)
    .toSorted((a, b) => b.count - a.count);
}
