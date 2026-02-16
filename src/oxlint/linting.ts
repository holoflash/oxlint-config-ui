import { spawn } from "node:child_process";
import { platform } from "node:process";
import type { LintOptions, OxlintRule } from "../types.js";
import {
  getState,
  setMessage,
  setLintInProgress,
  updateRuleHits,
  setInsightsData,
} from "../state.js";
import { render } from "../rendering/render.js";

function buildLintArgs(options: LintOptions): string[] {
  const { rule, isRunAll } = options;
  const state = getState();

  const typeAware =
    rule || isRunAll
      ? true
      : Object.values(state.rulesByCategory)
          .flat()
          .some((ruleItem) => ruleItem.isActive && ruleItem.type_aware === true);

  const args = ["-q", "--yes", "--package", `oxlint@${state.oxlintVersion}`];

  if (typeAware) {
    args.push("--package", `oxlint-tsgolint@${state.tsgolintVersion}`);
  }

  args.push("--", "oxlint");

  if (typeAware) {
    args.push("--type-aware");
  }

  args.push("--format=json");

  if (isRunAll) {
    args.push("-A", "all", "-W", "all");
  } else if (rule) {
    const ruleName = `${rule.scope}/${rule.value}`;
    args.push("-A", "all", "-D", ruleName);
  } else if (options.rules && options.rules.length > 0) {
    args.push("-A", "all");
    options.rules.forEach((r) => {
      args.push("-D", `${r.scope}/${r.value}`);
    });
  } else if (state.config && state.config.rules) {
    Object.entries(state.config.rules).forEach(([key, status]) => {
      const val = Array.isArray(status) ? status[0] : status;
      if (val === "error") args.push("-D", key);
      else if (val === "warn") args.push("-W", key);
      else if (val === "off") args.push("-A", key);
    });
  }

  return args;
}

function buildLintMessage(options: LintOptions): string {
  const { rule, isRunAll, rules } = options;
  const state = getState();

  let message = isRunAll ? "Running all rules" : "Linting";

  if (rule) {
    const ruleName = `${rule.scope}/${rule.value}`;
    message += ` [${ruleName}]`;
  } else if (rules && rules.length > 0) {
    const category = state.categories[state.selectedCategoryIndex];
    if (rules.length === state.rulesByCategory[category]?.length) {
      message += ` category '${category}' (${rules.length} rules)`;
    } else {
      message += ` ${rules.length} rules`;
    }
  }
  message += "...";

  return message;
}

function processLintOutput(stdoutData: string, stderrData: string, options?: LintOptions): void {
  try {
    const output = JSON.parse(stdoutData || "{}");
    const insightsData = output.diagnostics || [];
    setInsightsData(insightsData);

    const hitCounts: Record<string, number> = {};

    let lintedRules: OxlintRule[] | undefined;
    if (options?.rule) {
      lintedRules = [options.rule];
    } else if (options?.rules) {
      lintedRules = options.rules;
    } else if (options && !options.isRunAll) {
      lintedRules = Object.values(getState().rulesByCategory)
        .flat()
        .filter((r) => r.isActive);
    }

    insightsData.forEach((d: any) => {
      const code = d.code;
      hitCounts[code] = (hitCounts[code] || 0) + 1;
    });

    updateRuleHits(hitCounts, lintedRules);

    const errors = insightsData.filter((d: any) => d.severity === "error").length;
    const warnings = insightsData.filter((d: any) => d.severity === "warning").length;

    if (insightsData.length > 0) {
      setMessage(
        `Found ${warnings} warning${warnings === 1 ? "" : "s"} and ${errors} error${errors === 1 ? "" : "s"}`,
        errors > 0 ? "error" : "warn",
      );
    } else {
      setMessage("Linting passed! 0 issues found.", "success");
    }
  } catch {
    const cleanError = stderrData
      .split("\n")
      .filter(
        (l) => !l.includes("experimental") && !l.includes("Breaking changes") && l.trim() !== "",
      )
      .join(" ");

    setMessage(cleanError ? `Error: ${cleanError.substring(0, 50)}...` : "Lint failed", "error");
  }
}

export function runLint(options: LintOptions = {}): void {
  const state = getState();
  if (state.isLintInProgress) return;

  setLintInProgress(true);
  setMessage(buildLintMessage(options), "info");
  render();

  const args = buildLintArgs(options);

  const isWin = platform === "win32";
  const cmd = isWin ? "cmd.exe" : "npx";
  const finalArgs = isWin ? ["/c", "npx", ...args] : args;

  const child = spawn(cmd, finalArgs, {
    windowsHide: true,
  });

  let stdoutData = "";
  let stderrData = "";

  child.stdout.on("data", (data) => {
    stdoutData += data;
  });

  child.stderr.on("data", (data) => {
    stderrData += data;
  });

  child.on("close", () => {
    setLintInProgress(false);
    processLintOutput(stdoutData, stderrData, options);
    render();
  });
}
