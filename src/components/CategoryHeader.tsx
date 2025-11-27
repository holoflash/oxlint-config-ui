import React from "react";
import type { RuleLevel } from "../types/oxlint";

interface CategoryHeaderProps {
  categoryName: string;
  currentValue: RuleLevel;
  isExpanded: boolean;
  totalRulesCount: number;
  activeCount: number;
  isLoading: boolean;
  onToggle: (categoryName: string) => void;
  onChange: (categoryName: string, newValue: RuleLevel) => void;
  ruleOptions: RuleLevel[];
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  categoryName,
  currentValue,
  isExpanded,
  totalRulesCount,
  activeCount,
  isLoading,
  onToggle,
  onChange,
  ruleOptions,
}) => (
  <div className="rules-category-header">
    <button
      onClick={() => onToggle(categoryName)}
      className="category-toggle-button"
    >
      <span className="toggle-icon">{isExpanded ? "▼" : "►"}</span>
      <h3 className="rules-category-title">
        {categoryName}
        <span
          className={`rule-count-badge ${activeCount > 0 ? "active" : "inactive"}`}
        >
          {activeCount} / {totalRulesCount} active
        </span>
      </h3>
    </button>
    <select
      value={currentValue}
      onChange={(e) => onChange(categoryName, e.target.value as RuleLevel)}
      className={`category-select rule-level-${currentValue}`}
      disabled={isLoading}
    >
      {ruleOptions.map((option, index) => (
        <option key={index + option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);
