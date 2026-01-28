#!/usr/bin/env node

import fs from "node:fs";
import readline from "readline";
import { execSync, spawn } from "node:child_process";
import { stdout, stdin, exit, platform, argv } from "node:process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Action, State, OxlintRule, OxlintConfig, RuleStatus } from "./types.js";
import { render } from "./rendering.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OXLINT_VERSION = "1.41.0";
const TSGOLINT_VERSION = "0.11.1";

const KEY_MAP: Record<string, Action> = {
  k: { type: "MOVE_UP" },
  up: { type: "MOVE_UP" },
  down: { type: "MOVE_DOWN" },
  j: { type: "MOVE_DOWN" },
  left: { type: "MOVE_LEFT" },
  h: { type: "MOVE_LEFT" },
  right: { type: "MOVE_RIGHT" },
  l: { type: "MOVE_RIGHT" },
  return: { type: "OPEN_DOCS" },
  enter: { type: "OPEN_DOCS" },
  "1": { type: "SET_STATUS", value: "off" },
  "2": { type: "SET_STATUS", value: "warn" },
  "3": { type: "SET_STATUS", value: "error" },
  q: { type: "EXIT" },
  r: { type: "RUN_LINT" },
  x: { type: "RUN_SINGLE_RULE" },
};

export let state: State = {
  activePane: 0,
  selectedCategoryIndex: 0,
  selectedRuleIndex: 0,
  categoryScroll: 0,
  ruleScroll: 0,
  isLintInProgress: false,
  message: "oxlint-tui",
  messageType: "dim",
  ...loadRules(),
};

function updateConfig(rule: OxlintRule, newStatus: RuleStatus): void {
  if (!state.configPath || !state.config) return;
  try {
    if (!state.config.rules) state.config.rules = {};
    const ruleName = rule.value;
    const canonicalKey =
      rule.scope === "oxc2" || rule.scope === "eslint" ? ruleName : `${rule.scope}/${ruleName}`;

    const rules = state.config.rules;
    const existingKey = Object.keys(rules).find(
      (key) => key === canonicalKey || key === ruleName || key.endsWith(`/${ruleName}`),
    );
    const targetKey = existingKey || canonicalKey;
    rules[targetKey] = newStatus;

    fs.writeFileSync(state.configPath, JSON.stringify(state.config, null, 2), "utf8");
  } catch {
    state.message = "Failed to write config file";
    state.messageType = "error";
  }
}

function runLint({ rule = null }: { rule?: OxlintRule | null } = {}): void {
  if (state.isLintInProgress) return;

  state.isLintInProgress = true;

  let ruleName = rule ? `${rule.scope}/${rule.value}` : null;

  const typeAware = rule
    ? rule.type_aware
    : Object.values(state.rulesByCategory)
        .flat()
        .some((ruleItem) => ruleItem.isActive && ruleItem.type_aware === true);

  state.message = "Linting";
  if (ruleName) state.message += ` [${ruleName}]`;
  if (typeAware) state.message += " with --type-aware";
  state.message += "...";

  state.messageType = "info";

  render();

  const npxCmd = platform === "win32" ? "npx.cmd" : "npx";
  const args = ["-q", "--yes", "--package", `oxlint@${OXLINT_VERSION}`];

  if (typeAware) {
    args.push("--package", `oxlint-tsgolint@${TSGOLINT_VERSION}`);
  }

  args.push("--", "oxlint");

  if (typeAware) {
    args.push("--type-aware");
  }

  if (ruleName) {
    args.push("-A", "all", "-D", ruleName);
  }

  const child = spawn(npxCmd, args);

  let stdoutData = "";
  let stderrData = "";

  child.stdout.on("data", (data) => {
    stdoutData += data;
  });
  child.stderr.on("data", (data) => {
    stderrData += data;
  });

  child.on("close", (code) => {
    state.isLintInProgress = false;

    const fullOutput = stdoutData + stderrData;
    const summaryMatch = fullOutput.match(/Found (\d+) warnings? and (\d+) errors?/i);

    if (summaryMatch) {
      const errors = parseInt(summaryMatch[2]);
      state.message = ruleName
        ? `[${ruleName}] Found ${errors} issue${errors === 1 ? "" : "s"}`
        : summaryMatch[0];
      state.messageType = errors > 0 ? "error" : "warn";
    } else if (
      stdoutData.toLowerCase().includes("finished") ||
      (code === 0 && stdoutData.length < 200)
    ) {
      state.message = "Linting passed! 0 issues found.";
      if (ruleName) state.message = `[${ruleName}] ${state.message}`;
      state.messageType = "success";
    } else {
      const cleanError = stderrData
        .split("\n")
        .filter(
          (l) => !l.includes("experimental") && !l.includes("Breaking changes") && l.trim() !== "",
        )
        .join(" ");

      state.message = cleanError ? `Error: ${cleanError.substring(0, 50)}...` : "Lint failed";
      state.messageType = "error";
    }
    render();
  });
}

function execute(action: Action | null): void {
  if (!action) return;

  const { categories, rulesByCategory, selectedCategoryIndex, selectedRuleIndex, activePane } =
    state;
  const currentCategory = categories[selectedCategoryIndex];
  const currentCategoryRules = rulesByCategory[currentCategory] || [];
  const viewportHeight = stdout.rows - 8;
  const statsBoxHeight = 7;
  const categoryListHeight = viewportHeight - statsBoxHeight;

  switch (action.type) {
    case "EXIT":
      exitAltScreen();
      exit(0);
      return;

    case "RUN_LINT":
      runLint();
      return;

    case "RUN_SINGLE_RULE": {
      const rule = currentCategoryRules[selectedRuleIndex];
      if (rule) runLint({ rule });
      return;
    }

    case "OPEN_DOCS": {
      if (activePane === 1) {
        const rule = currentCategoryRules[selectedRuleIndex];
        if (rule) openUrl(rule.docs_url || rule.url);
      }
      return;
    }

    case "SET_STATUS": {
      if (activePane !== 1 || !action.value) return;
      const rule = currentCategoryRules[selectedRuleIndex];
      if (!rule) return;
      updateConfig(rule, action.value);
      const updatedRules = [...currentCategoryRules];
      updatedRules[selectedRuleIndex] = {
        ...rule,
        configStatus: action.value,
        isActive: action.value === "error" || action.value === "warn",
      };
      state = {
        ...state,
        message: `Rule '${rule.value}' set to: ${action.value}`,
        messageType: "info",
        rulesByCategory: {
          ...rulesByCategory,
          [currentCategory]: updatedRules,
        },
      };
      render();
      return;
    }

    case "MOVE_RIGHT":
      if (activePane !== 1) {
        state = { ...state, activePane: activePane + 1 };
        render();
      }
      return;

    case "MOVE_LEFT":
      if (activePane !== 0) {
        state = { ...state, activePane: activePane - 1 };
        render();
      }
      return;

    case "MOVE_UP":
      if (activePane === 0) {
        const nextIndex =
          selectedCategoryIndex === 0 ? categories.length - 1 : selectedCategoryIndex - 1;
        state = {
          ...state,
          selectedCategoryIndex: nextIndex,
          selectedRuleIndex: 0,
          ruleScroll: 0,
          categoryScroll: updateScroll(nextIndex, state.categoryScroll, categoryListHeight),
        };
      } else if (activePane === 1) {
        const nextIndex =
          selectedRuleIndex === 0 ? currentCategoryRules.length - 1 : selectedRuleIndex - 1;
        state = {
          ...state,
          selectedRuleIndex: nextIndex,
          ruleScroll: updateScroll(nextIndex, state.ruleScroll, viewportHeight),
        };
      }
      render();
      return;

    case "MOVE_DOWN":
      if (activePane === 0) {
        const nextIndex =
          selectedCategoryIndex === categories.length - 1 ? 0 : selectedCategoryIndex + 1;
        state = {
          ...state,
          selectedCategoryIndex: nextIndex,
          selectedRuleIndex: 0,
          ruleScroll: 0,
          categoryScroll: updateScroll(nextIndex, state.categoryScroll, categoryListHeight),
        };
      } else if (activePane === 1) {
        const nextIndex =
          selectedRuleIndex === currentCategoryRules.length - 1 ? 0 : selectedRuleIndex + 1;
        state = {
          ...state,
          selectedRuleIndex: nextIndex,
          ruleScroll: updateScroll(nextIndex, state.ruleScroll, viewportHeight),
        };
      }
      render();
      return;
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

function stripJsonComments(json: string): string {
  return json.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m));
}

function loadRules(): Pick<State, "categories" | "rulesByCategory" | "config" | "configPath"> {
  let rulesData: any[] = [];
  let config: OxlintConfig = {
    rules: {},
    categories: {},
  };
  let configPath: string | null = null;

  let descriptions: Record<string, Record<string, string>> = {};
  const descriptionsPath = join(__dirname, "./", "rule-descriptions.json");

  try {
    if (fs.existsSync(descriptionsPath)) {
      descriptions = JSON.parse(fs.readFileSync(descriptionsPath, "utf8"));
    }
  } catch {
    state.message = "Error: Couldn't find description.";
    state.messageType = "error";
  }

  try {
    const raw = execSync(`npx -q --yes oxlint@${OXLINT_VERSION} --rules --format=json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    rulesData = JSON.parse(raw);
  } catch {
    state.message = "Error: Couldn't run 'npx oxlint'.";
    state.messageType = "error";
    exit(1);
  }

  const userConfigPath = argv[2];
  if (userConfigPath && fs.existsSync(userConfigPath)) {
    configPath = userConfigPath;
  } else if (fs.existsSync(".oxlintrc.json")) {
    configPath = ".oxlintrc.json";
  }

  if (configPath) {
    try {
      config = JSON.parse(stripJsonComments(fs.readFileSync(configPath, "utf8")));
    } catch {
      state.message = "Error: Couldn't parse config.";
      state.messageType = "error";
    }
  }

  const map: Record<string, OxlintRule[]> = {};
  rulesData.forEach((rule: any) => {
    const cat = rule.category || "Uncategorized";
    if (!map[cat]) map[cat] = [];
    const status = getRuleStatus(rule.value, cat, config);
    const description = descriptions[rule.scope]?.[rule.value];

    map[cat].push({
      ...rule,
      description,
      configStatus: status,
      isActive: status === "error" || status === "warn",
    });
  });

  const categories = Object.keys(map).toSorted();
  return {
    categories,
    rulesByCategory: map,
    config,
    configPath,
  };
}

function updateScroll(idx: number, currentScroll: number, viewHeight: number): number {
  if (idx < currentScroll) return idx;
  if (idx >= currentScroll + viewHeight) return idx - viewHeight + 1;
  return currentScroll;
}

function openUrl(url: string | undefined): void {
  if (!url) return;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "explorer" : "xdg-open";

  const process = spawn(cmd, [url], {
    detached: true,
    stdio: "ignore",
  });

  process.unref();
}

const write = (str: string) => stdout.write(str);
const enterAltScreen = () => write("\x1b[?1049h\x1b[?25l");
const exitAltScreen = () => write("\x1b[?1049l\x1b[?25h");

readline.emitKeypressEvents(stdin);
if (stdin.isTTY) stdin.setRawMode(true);

stdin.on("keypress", (_, key) => {
  const action =
    KEY_MAP[key.name] ||
    (key.ctrl && key.name === "c" ? { type: "EXIT" } : KEY_MAP[key.sequence] || null);
  execute(action);
});

stdout.on("resize", render);
enterAltScreen();
render();
