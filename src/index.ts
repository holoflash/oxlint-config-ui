#!/usr/bin/env node

import fs from "node:fs";
import readline from "readline";
import { execSync, exec, spawn } from "node:child_process";
import { stdout, stdin, exit, platform, argv } from "node:process";
import { type Action, type State, type OxlintRule, type OxlintConfig, type RuleStatus, COLORS } from "./model.js";

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

let state: State = {
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
      rule.scope === "oxc2" || rule.scope === "eslint"
        ? ruleName
        : `${rule.scope}/${ruleName}`;

    const rules = state.config.rules;
    const existingKey = Object.keys(rules).find(
      (key) =>
        key === canonicalKey ||
        key === ruleName ||
        key.endsWith(`/${ruleName}`),
    );
    const targetKey = existingKey || canonicalKey;
    rules[targetKey] = newStatus;

    fs.writeFileSync(
      state.configPath,
      JSON.stringify(state.config, null, 2),
      "utf8",
    );
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
    const summaryMatch = fullOutput.match(
      /Found (\d+) warnings? and (\d+) errors?/i,
    );

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
          (l) =>
            !l.includes("experimental") &&
            !l.includes("Breaking changes") &&
            l.trim() !== "",
        )
        .join(" ");

      state.message = cleanError
        ? `Error: ${cleanError.substring(0, 50)}...`
        : "Lint failed";
      state.messageType = "error";
    }
    render();
  });
}

function execute(action: Action | null): void {
  if (!action) return;

  const {
    categories,
    rulesByCategory,
    selectedCategoryIndex,
    selectedRuleIndex,
    activePane,
  } = state;
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
          selectedCategoryIndex === 0
            ? categories.length - 1
            : selectedCategoryIndex - 1;
        state = {
          ...state,
          selectedCategoryIndex: nextIndex,
          selectedRuleIndex: 0,
          ruleScroll: 0,
          categoryScroll: updateScroll(
            nextIndex,
            state.categoryScroll,
            categoryListHeight,
          ),
        };
      } else if (activePane === 1) {
        const nextIndex =
          selectedRuleIndex === 0
            ? currentCategoryRules.length - 1
            : selectedRuleIndex - 1;
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
          selectedCategoryIndex === categories.length - 1
            ? 0
            : selectedCategoryIndex + 1;
        state = {
          ...state,
          selectedCategoryIndex: nextIndex,
          selectedRuleIndex: 0,
          ruleScroll: 0,
          categoryScroll: updateScroll(
            nextIndex,
            state.categoryScroll,
            categoryListHeight,
          ),
        };
      } else if (activePane === 1) {
        const nextIndex =
          selectedRuleIndex === currentCategoryRules.length - 1
            ? 0
            : selectedRuleIndex + 1;
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
      const foundKey = Object.keys(config.rules).find((key) =>
        key.endsWith(`/${ruleName}`),
      );
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
  return json.replace(
    /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
    (m, g) => (g ? "" : m),
  );
}

function loadRules(): Pick<State, "categories" | "rulesByCategory" | "config" | "configPath"> {
  let rulesData: any[] = [];
  let config: OxlintConfig = {
    rules: {},
    categories: {},
  };
  let configPath: string | null = null;

  try {
    const raw = execSync(
      `npx -q --yes oxlint@${OXLINT_VERSION} --rules --format=json`,
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    rulesData = JSON.parse(raw);
  } catch {
    console.error(
      `${COLORS.error}Error: Could not run 'npx oxlint'.${COLORS.reset}`,
    );
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
      config = JSON.parse(
        stripJsonComments(fs.readFileSync(configPath, "utf8")),
      );
    } catch {
      console.error(
        `${COLORS.error}Error: Couldn't parse config.${COLORS.reset}`,
      );
    }
  }

  const map: Record<string, OxlintRule[]> = {};
  rulesData.forEach((rule: any) => {
    const cat = rule.category || "Uncategorized";
    if (!map[cat]) map[cat] = [];
    const status = getRuleStatus(rule.value, cat, config);
    map[cat].push({
      ...rule,
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
  const openCmd =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${openCmd} "${url}"`);
}

function chunkString(str: string, len: number): string[] {
  if (!str) return [];
  const size = Math.ceil(str.length / len);
  const r = Array(size);
  for (let i = 0; i < size; i++) r[i] = str.substring(i * len, (i + 1) * len);
  return r;
}

const write = (str: string) => stdout.write(str);
const enterAltScreen = () => write("\x1b[?1049h\x1b[?25l");
const exitAltScreen = () => write("\x1b[?1049l\x1b[?25h");

function drawBox(
  buffer: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  items: (OxlintRule | string)[],
  selectedIndex: number,
  scrollOffset: number,
  isActive: boolean,
): void {
  const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;
  const titleClean =
    title.length > width - 6 ? title.substring(0, width - 7) + "…" : title;
  const topBorder = `${borderColor}┌─ ${titleClean} `.padEnd(
    width + borderColor.length - 1,
    "─",
  );
  buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);

  for (let i = 1; i < height - 1; i++) {
    buffer.push(
      `\x1b[${y + i};${x}H${borderColor}│${" ".repeat(width - 2)}│${COLORS.reset}`,
    );
  }
  buffer.push(
    `\x1b[${y + height - 1};${x}H${borderColor}└${"─".repeat(width - 2)}┘${COLORS.reset}`,
  );

  const innerHeight = height - 2;
  items.slice(scrollOffset, scrollOffset + innerHeight).forEach((item, i) => {
    const absoluteIndex = scrollOffset + i;
    const isRule = typeof item !== "string";
    const rawText = isRule ? (item).value : (item);

    let display =
      rawText.length > width - 4
        ? rawText.substring(0, width - 5) + "…"
        : rawText.padEnd(width - 4);

    let itemColor: string = COLORS.dim;
    if (isRule) {
      const ruleItem = item;
      if (ruleItem.configStatus === "error") itemColor = COLORS.error;
      else if (ruleItem.configStatus === "warn") itemColor = COLORS.warn;
      else if (ruleItem.isActive) itemColor = COLORS.success;
    }

    buffer.push(`\x1b[${y + 1 + i};${x + 2}H`);
    if (absoluteIndex === selectedIndex) {
      buffer.push(
        isActive
          ? `${COLORS.selectedBg}${display}${COLORS.reset}`
          : `${COLORS.dim}\x1b[7m${display}${COLORS.reset}`,
      );
    } else {
      buffer.push(`${itemColor}${display}${COLORS.reset}`);
    }
  });
}

function drawStats(buffer: string[], x: number, y: number, width: number, height: number, rules: OxlintRule[]): void {
  const borderColor = COLORS.borderInactive;
  const topBorder = `${borderColor}┌─ STATS `.padEnd(
    width + borderColor.length - 1,
    "─",
  );
  buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);
  for (let i = 1; i < height - 1; i++)
    buffer.push(
      `\x1b[${y + i};${x}H${borderColor}│${" ".repeat(width - 2)}│${COLORS.reset}`,
    );
  buffer.push(
    `\x1b[${y + height - 1};${x}H${borderColor}└${"─".repeat(width - 2)}┘${COLORS.reset}`,
  );

  let counts = { error: 0, warn: 0, off: 0 };
  rules.forEach((ruleItem) => {
    if (ruleItem.configStatus === "error") counts.error++;
    else if (ruleItem.configStatus === "warn") counts.warn++;
    else counts.off++;
  });

  const lines = [
    { label: "Error", count: counts.error, color: COLORS.error },
    { label: "Warn", count: counts.warn, color: COLORS.warn },
    { label: "Off", count: counts.off, color: COLORS.dim },
  ];

  lines.forEach((line, i) => {
    if (i < height - 2) {
      const numStr = String(line.count).padStart(3);
      const labelStr = line.label.padEnd(width - 8);
      buffer.push(
        `\x1b[${y + 1 + i};${x + 2}H${line.color}${labelStr}${numStr}${COLORS.reset}`,
      );
    }
  });
}

function drawDetails(buffer: string[], x: number, y: number, width: number, height: number, rule: OxlintRule | undefined, isActive: boolean): void {
  const borderColor = isActive ? COLORS.borderActive : COLORS.borderInactive;
  const topBorder = `${borderColor}┌─ DETAILS `.padEnd(
    width + borderColor.length - 1,
    "─",
  );
  buffer.push(`\x1b[${y};${x}H${topBorder}┐${COLORS.reset}`);
  for (let i = 1; i < height - 1; i++)
    buffer.push(
      `\x1b[${y + i};${x}H${borderColor}│${" ".repeat(width - 2)}│${COLORS.reset}`,
    );
  buffer.push(
    `\x1b[${y + height - 1};${x}H${borderColor}└${"─".repeat(width - 2)}┘${COLORS.reset}`,
  );

  if (!rule) return;

  let statusDisplay = rule.configStatus.toUpperCase();
  if (rule.configStatus === "error")
    statusDisplay = `${COLORS.error}${statusDisplay}${COLORS.reset}`;
  else if (rule.configStatus === "warn")
    statusDisplay = `${COLORS.warn}${statusDisplay}${COLORS.reset}`;
  else statusDisplay = `${COLORS.dim}${statusDisplay}${COLORS.reset}`;

  const labels: [string, string][] = [
    ["Name", rule.value],
    ["Status", statusDisplay],
    ["Category", rule.category],
    ["Scope", rule.scope],
    ["Fix", rule.fix || "N/A"],
    ["Default", rule.default ? "Yes" : "No"],
    ["Type-aware", rule.type_aware ? "Yes" : "No"],
    ["Docs", `Hit ${COLORS.highlight}ENTER${COLORS.reset} to open docs`],
  ];

  let line = 0;
  labels.forEach(([lbl, val]) => {
    if (lbl === "Status" && line < height - 2) {
      buffer.push(
        `\x1b[${y + 1 + line};${x + 2}H${COLORS.highlight}${lbl.padEnd(10)} ${COLORS.reset}${val}`,
      );
      line++;
      return;
    }
    const chunks = chunkString(String(val || "N/A"), width - 15);
    chunks.forEach((chunk) => {
      if (line < height - 2) {
        buffer.push(
          `\x1b[${y + 1 + line};${x + 2}H${COLORS.highlight}${lbl.padEnd(10)} ${COLORS.reset}${chunk}`,
        );
        line++;
      }
    });
  });
}

function render(): void {
  const { columns = 80, rows = 24 } = stdout;
  const currentCategory = state.categories[state.selectedCategoryIndex];
  const rules = state.rulesByCategory[currentCategory] || [];
  const rule = rules[state.selectedRuleIndex];
  const boxHeight = rows - 5;
  const categoriesColumnWidth = Math.floor(columns * 0.2);
  const rulesColumnWidth = Math.floor(columns * 0.3);
  const detailsColumnWidth =
    columns - categoriesColumnWidth - rulesColumnWidth - 2;
  const statsHeight = 6;
  const categoryListHeight = boxHeight - statsHeight;

  const buffer = ["\x1b[H\x1b[J"];
  drawBox(
    buffer,
    1,
    1,
    categoriesColumnWidth,
    categoryListHeight,
    "CATEGORIES",
    state.categories,
    state.selectedCategoryIndex,
    state.categoryScroll,
    state.activePane === 0,
  );
  drawStats(
    buffer,
    1,
    1 + categoryListHeight,
    categoriesColumnWidth,
    statsHeight,
    rules,
  );
  drawBox(
    buffer,
    categoriesColumnWidth + 1,
    1,
    rulesColumnWidth,
    boxHeight,
    `RULES (${rules.length})`,
    rules,
    state.selectedRuleIndex,
    state.ruleScroll,
    state.activePane === 1,
  );
  drawDetails(
    buffer,
    categoriesColumnWidth + rulesColumnWidth + 1,
    1,
    detailsColumnWidth,
    boxHeight,
    rule,
    state.activePane === 2,
  );

  const msgColor = COLORS[state.messageType] || COLORS.reset;
  buffer.push(
    `\x1b[${rows - 3};2H${msgColor}● ${state.message}${COLORS.reset}`,
  );

  const footerConfig = state.configPath
    ? `Config: ${state.configPath}`
    : "No config loaded";
  buffer.push(
    `\x1b[${rows - 1};2H${COLORS.dim}Arrows/HJKL: Nav | 1-3: Status | R: Lint | X: Run rule | Enter: Docs | Q: Quit | ${footerConfig}${COLORS.reset}`,
  );
  write(buffer.join(""));
}

readline.emitKeypressEvents(stdin);
if (stdin.isTTY) stdin.setRawMode(true);

stdin.on("keypress", (_, key) => {
  const action =
    KEY_MAP[key.name] ||
    (key.ctrl && key.name === "c"
      ? { type: "EXIT" }
      : KEY_MAP[key.sequence] || null);
  execute(action);
});

stdout.on("resize", render);
enterAltScreen();
render();