import React, { useState } from "react";
import "./index.css";
import { RULES_BY_CATEGORY, type Rule } from "./rules";
import { RuleItem } from "./components/RuleItem";
import { CategoryHeader } from "./components/CategoryHeader";
import { useOxlintConfig } from "./hooks/useOxlintConfig";
import { useActiveRules } from "./hooks/useActiveRules";
import { CATEGORY_ORDER, type RuleLevel } from "./types/oxlint";

const RULE_OPTIONS: RuleLevel[] = ["error", "warn", "off"];

export function App() {
  const {
    responseInputRef,
    config,
    setConfig,
    isLoading,
    setIsLoading,
    getRuleLevel,
    runLintAndDisplay,
    loadConfig,
  } = useOxlintConfig();

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const { activeRules, categoryActiveCounts } = useActiveRules(config);

  const updateConfig = async (updatedConfig: any) => {
    try {
      setIsLoading(true);
      const res = await fetch("/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      const data = await res.json();
      if (responseInputRef.current) {
        if (res.ok) {
          setConfig(data.contents);
          responseInputRef.current.textContent = "Running oxlint...";
          await runLintAndDisplay();
        } else {
          responseInputRef.current.textContent = `Error: ${data.message || (await res.text())}`;
          await loadConfig();
        }
      }
    } catch (error) {
      if (responseInputRef.current) {
        responseInputRef.current.textContent = `Error updating config: ${error}`;
      }
      await loadConfig();
    } finally {
      setIsLoading(false);
    }
  };

  const updateRuleValue = (ruleName: string, newValue: string) => {
    const updatedRules = { ...config.rules };
    if (newValue === "off") {
      delete updatedRules[ruleName];
    } else {
      updatedRules[ruleName] = newValue;
    }
    const updatedConfig = {
      ...config,
      rules: updatedRules,
    };
    updateConfig(updatedConfig);
  };

  const updateCategory = (categoryName: string, newValue: string) => {
    const updatedCategories = { ...config.categories };
    if (newValue === "off") {
      delete updatedCategories[categoryName];
    } else {
      updatedCategories[categoryName] = newValue;
    }

    const rulesInCategory = (RULES_BY_CATEGORY[categoryName] || []) as Rule[];
    const updatedRules = { ...config.rules };

    for (const rule of rulesInCategory) {
      if (newValue === "off") {
        delete updatedRules[rule.name];
      } else {
        updatedRules[rule.name] = newValue;
      }
    }

    const updatedConfig = {
      ...config,
      categories: updatedCategories,
      rules: updatedRules,
    };
    updateConfig(updatedConfig);
  };

  const disableAllRules = () => {
    const clearedRules: Record<string, string> = {};
    const updatedConfig = {
      ...config,
      rules: clearedRules,
    };
    updateConfig(updatedConfig);
  };

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  return (
    <div className="oxlint-manager">
      <div className="output-section">
        <h2>Lint Status</h2>

        <p
          ref={responseInputRef as React.RefObject<HTMLParagraphElement>}
          className="output-status"
        ></p>
      </div>

      <hr />

      <div className="rules-menu-section">
        <h2>Configure Rules</h2>
        {CATEGORY_ORDER.map((categoryName) => {
          const isExpanded = !!expandedCategories[categoryName];
          const currentValue =
            (config.categories?.[categoryName] as RuleLevel) || "off";

          const rules = (RULES_BY_CATEGORY[categoryName] || []) as Rule[];
          const totalRulesCount = rules.length;
          const activeCount = categoryActiveCounts[categoryName] || 0;

          return (
            <div
              key={`rules-category-block-${categoryName}`}
              className={`rules-category-block ${isExpanded ? "expanded" : "collapsed"}`}
            >
              <CategoryHeader
                categoryName={categoryName}
                currentValue={currentValue}
                isExpanded={isExpanded}
                totalRulesCount={totalRulesCount}
                activeCount={activeCount}
                isLoading={isLoading}
                onToggle={toggleCategoryExpansion}
                onChange={updateCategory}
                ruleOptions={RULE_OPTIONS}
              />

              <div className="rules-menu-content">
                {isExpanded && (
                  <div className="rules-menu-list">
                    {rules.map((rule) => (
                      <RuleItem
                        key={rule.name}
                        ruleName={rule.name}
                        categoryName={categoryName}
                        vendorName={rule.vendor}
                        currentValue={getRuleLevel(rule.name, categoryName)}
                        isLoading={isLoading}
                        onChange={updateRuleValue}
                        ruleOptions={RULE_OPTIONS}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <hr />
      <div className="active-rules-section">
        <h2>Active Rules ({activeRules.length})</h2>
        {activeRules.length > 0 && (
          <div className="active-rules-controls">
            <button
              onClick={disableAllRules}
              disabled={isLoading}
              className="disable-all-button"
            >
              X Disable All Active Rules
            </button>
          </div>
        )}

        <div className="active-rules-list">
          {activeRules.length === 0 ? (
            <p className="no-active-rules">
              No rules are currently set to 'warn' or 'error'.
            </p>
          ) : (
            activeRules.map(({ name, level }) => (
              <span
                key={name}
                className={`active-rule-tag rule-level-${level}`}
              >
                {name} <span className="rule-level-text">[{level}]</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
