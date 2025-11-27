import React from "react";
import type { RuleLevel } from "../types/oxlint";

interface RuleItemProps {
  ruleName: string;
  categoryName: string;
  vendorName: string;
  currentValue: RuleLevel;
  isLoading: boolean;
  onChange: (ruleName: string, newValue: RuleLevel) => void;
  ruleOptions: RuleLevel[];
}

const BASE_DOCS_URL = "https://oxc.rs/docs/guide/usage/linter/rules";

export const RuleItem: React.FC<RuleItemProps> = ({
  ruleName,
  vendorName,
  currentValue,
  isLoading,
  onChange,
  ruleOptions,
}) => {
  const docUrl = `${BASE_DOCS_URL}/${vendorName}/${ruleName.replace(/-/g, "-")}.html`;

  return (
    <div key={`rule-item-${ruleName}-${vendorName}`} className="rule-menu-item">
      <div className="rule-name-group">
        <span className="rule-menu-name">{ruleName}</span>
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rule-doc-link rule-doc-button"
          aria-label={`View documentation for ${ruleName}`}
        >
          ?
        </a>
      </div>
      <select
        value={currentValue}
        onChange={(e) => onChange(ruleName, e.target.value as RuleLevel)}
        className={`rule-menu-select rule-level-${currentValue}`}
        disabled={isLoading}
      >
        {ruleOptions.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};
