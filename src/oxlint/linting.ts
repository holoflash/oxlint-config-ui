import { spawn } from "node:child_process";
import { platform } from "node:process";
import type { LintOptions, OxlintRule } from "../types.js";
import { getState, setMessage, setLintInProgress, updateRuleHits } from "../state.js";
import render from "../rendering/index.js";

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
  const { rule, isRunAll } = options;
  const state = getState();

  const typeAware =
    rule || isRunAll
      ? true
      : Object.values(state.rulesByCategory)
          .flat()
          .some((ruleItem) => ruleItem.isActive && ruleItem.type_aware === true);

  let message = isRunAll ? "Running all rules" : "Linting";

  if (rule) {
    const ruleName = `${rule.scope}/${rule.value}`;
    message += ` [${ruleName}]`;
  }

  if (typeAware) {
    message += " with --type-aware";
  }

  message += "...";

  return message;
}

function processLintOutput(
  stdoutData: string,
  stderrData: string,
  lintedRules?: OxlintRule[],
): void {
  try {
    const output = JSON.parse(stdoutData || "{}");
    const diagnostics = output.diagnostics || [];
    const hitCounts: Record<string, number> = {};

    diagnostics.forEach((d: any) => {
      const code = d.code;
      hitCounts[code] = (hitCounts[code] || 0) + 1;
    });

    updateRuleHits(hitCounts, lintedRules);

    const errors = diagnostics.filter((d: any) => d.severity === "error").length;
    const warnings = diagnostics.filter((d: any) => d.severity === "warning").length;

    if (diagnostics.length > 0) {
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

    let lintedRules: OxlintRule[] | undefined;
    if (options.rule) {
      lintedRules = [options.rule];
    } else if (!options.isRunAll) {
      lintedRules = Object.values(getState().rulesByCategory)
        .flat()
        .filter((r) => r.isActive);
    }
    processLintOutput(stdoutData, stderrData, lintedRules);
    render();
  });
}
