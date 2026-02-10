import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { exit, argv } from "node:process";
import type { OxlintRule, OxlintConfig, RuleStatus, RulesState } from "../types.js";
import { getState } from "../state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export function loadDescriptions() {
  const compressedPath = path.join(__dirname, "rule-descriptions.br");
  if (fs.existsSync(compressedPath)) {
    return JSON.parse(zlib.brotliDecompressSync(fs.readFileSync(compressedPath)).toString());
  }
}

function getRuleStatus(ruleName: string, category: string, config: OxlintConfig): RuleStatus {
  if (config.rules) {
    let val = config.rules[ruleName];
    if (val === undefined) {
      const foundKey = Object.keys(config.rules).find((key) => key.endsWith(`/${ruleName}`));
      if (foundKey) val = config.rules[foundKey];
    }
    if (val !== undefined) {
      const status = Array.isArray(val) ? val[0] : val;
      return status;
    }
  }
  if (config.categories && config.categories[category]) {
    return config.categories[category];
  }
  return "off";
}

function fetchRulesFromOxlint(): any[] {
  try {
    const raw = execSync(`npx -q --yes oxlint@${getState().oxlintVersion} --rules --format=json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error: Couldn't run 'npx oxlint'.", error);
    exit(1);
  }
}

function loadConfig(): { config: OxlintConfig; configPath: string | null } {
  let config: OxlintConfig = {
    rules: {},
    categories: {},
  };
  let configPath: string | null = null;

  const userConfigPath = argv[2];
  if (userConfigPath && fs.existsSync(userConfigPath)) {
    configPath = userConfigPath;
  } else if (fs.existsSync(".oxlintrc.json")) {
    configPath = ".oxlintrc.json";
  }

  if (configPath) {
    try {
      config = JSON.parse(
        fs
          .readFileSync(configPath, "utf8")
          .replace(/^\uFEFF/, "")
          .replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m)),
      );
    } catch (error) {
      console.error("Error: Couldn't parse config: ", error);
    }
  }
  return { config, configPath };
}

function categorizeRules(
  rulesData: any[],
  descriptions: Record<string, Record<string, string>> | undefined,
  config: OxlintConfig,
): Record<string, OxlintRule[]> {
  const map: Record<string, OxlintRule[]> = {};
  const fixableRules: OxlintRule[] = [];
  const defaultRules: OxlintRule[] = [];
  const typeAwareRules: OxlintRule[] = [];
  const scopes: Record<string, OxlintRule[]> = {};

  rulesData.forEach((rule: any) => {
    const cat = rule.category;
    if (!map[cat]) map[cat] = [];

    const status = getRuleStatus(rule.value, cat, config);
    const description = descriptions?.[rule.scope]?.[rule.value];

    const ruleObj: OxlintRule = {
      ...rule,
      description,
      configStatus: status,
      isActive: status === "error" || status === "warn",
    };

    if (rule.scope) {
      if (!scopes[rule.scope]) scopes[rule.scope] = [];
      scopes[rule.scope].push(ruleObj);
    }

    map[cat].push(ruleObj);

    if (rule.fix && rule.fix !== "none" && rule.fix !== "pending") {
      fixableRules.push(ruleObj);
    }
    if (rule.default === true) {
      defaultRules.push(ruleObj);
    }
    if (rule.type_aware === true) {
      typeAwareRules.push(ruleObj);
    }
  });

  map["fixable"] = fixableRules;
  map["default"] = defaultRules;
  map["type-aware"] = typeAwareRules;

  Object.entries(scopes).forEach(([scope, rules]) => {
    map[scope] = rules;
  });

  return map;
}

export function loadRules(): RulesState {
  const descriptions = loadDescriptions();
  const rulesData = fetchRulesFromOxlint();
  const { config, configPath } = loadConfig();
  const rulesByCategory = categorizeRules(rulesData, descriptions, config);

  const specialCategories = ["default", "fixable", "type-aware"];

  const ruleCategories = new Set(rulesData.map((r: any) => r.category));
  const allKeys = Object.keys(rulesByCategory);
  const scopes = allKeys.filter((k) => !specialCategories.includes(k) && !ruleCategories.has(k));
  const categories = allKeys.filter((k) => !specialCategories.includes(k) && ruleCategories.has(k));

  const groupedCategories = [
    ...categories.toSorted(),
    "-SCOPES",
    ...scopes.toSorted(),
    "-FILTERS",
    ...specialCategories,
  ];

  rulesByCategory["-SCOPES"] = [];
  rulesByCategory["-FILTERS"] = [];

  return {
    categories: groupedCategories,
    rulesByCategory,
    config,
    configPath,
  };
}
