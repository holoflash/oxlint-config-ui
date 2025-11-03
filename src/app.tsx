import { useRef, useState, useEffect } from "react";
import "./index.css";
import { RULES_BY_CATEGORY } from "./rules";

interface OxlintConfig {
  $schema?: string;
  categories?: Record<string, string>;
  rules?: Record<string, string>;
  [key: string]: any;
}

export function App() {
  const responseInputRef = useRef<HTMLTextAreaElement>(null);
  const [config, setConfig] = useState<OxlintConfig>({});
  const [isLoading, setIsLoading] = useState(false);
  // const rulesFeatureIsEnabled = false;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/config");
      const data = await res.json();
      setConfig(data.contents || {});

      responseInputRef.current!.value = "Loading config and running lint...";
      await runLintAndDisplay();
    } catch (error) {
      responseInputRef.current!.value = `Error loading config: ${error}`;
    } finally {
      setIsLoading(false);
    }
  };

  const runLintAndDisplay = async () => {
    try {
      const res = await fetch("/lint");
      const data = await res.json();
      responseInputRef.current!.value = data.summary || "No summary available";
    } catch (error) {
      responseInputRef.current!.value = `Error running lint: ${error}`;
    }
  };

  // Enable rule value update for the rule menu
  const updateRuleValue = async (ruleName: string, newValue: string) => {
    try {
      setIsLoading(true);
      const updatedConfig = {
        ...config,
        rules: {
          ...config.rules,
          [ruleName]: newValue,
        },
      };

      const res = await fetch("/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      const data = await res.json();

      if (res.ok) {
        setConfig(data.contents);
        responseInputRef.current!.value = `Rule "${ruleName}" updated to "${newValue}"! Running lint...`;
        await runLintAndDisplay();
      } else {
        responseInputRef.current!.value = `Error: ${data.message || (await res.text())}`;
        await loadConfig();
      }
    } catch (error) {
      responseInputRef.current!.value = `Error updating rule: ${error}`;
      await loadConfig();
    } finally {
      setIsLoading(false);
    }
  };

  // When a category is toggled, update all rules in that category to match
  const updateCategory = async (categoryName: string, newValue: string) => {
    try {
      setIsLoading(true);
      const updatedCategories = { ...config.categories };
      updatedCategories[categoryName] = newValue;

      // Update all rules in this category
      const rulesInCategory = RULES_BY_CATEGORY[categoryName] || [];
      const updatedRules = { ...config.rules };
      for (const rule of rulesInCategory) {
        updatedRules[rule] = newValue;
      }

      const updatedConfig = {
        ...config,
        categories: updatedCategories,
        rules: updatedRules,
      };

      const res = await fetch("/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      const data = await res.json();

      if (res.ok) {
        setConfig(data.contents);
        responseInputRef.current!.value = `Category "${categoryName}" updated to "${newValue}"! All rules in this category set to "${newValue}". Running lint...`;
        await runLintAndDisplay();
      } else {
        responseInputRef.current!.value = `Error: ${data.message || (await res.text())}`;
        await loadConfig();
      }
    } catch (error) {
      responseInputRef.current!.value = `Error updating category: ${error}`;
      await loadConfig();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="oxlint-manager">
      <div className="output-section">
        <h2>Lint Results</h2>
        <textarea
          ref={responseInputRef}
          readOnly
          placeholder="..."
          className="output-area"
          rows={1}
        />
      </div>

      {/* Categories Section */}
      <div className="categories-section">
        <h2>Rule Categories</h2>
        <div className="categories-grid">
          {[
            "correctness",
            "nursery",
            "pedantic",
            "perf",
            "restriction",
            "style",
            "suspicious",
          ].map((categoryName) => {
            const currentValue = config.categories?.[categoryName] || "off";
            return (
              <div key={categoryName} className="category-item">
                <span className="category-name">{categoryName}</span>
                <select
                  value={currentValue}
                  onChange={(e) => updateCategory(categoryName, e.target.value)}
                  className="category-select"
                  disabled={isLoading}
                >
                  <option value="error">error</option>
                  <option value="warn">warn</option>
                  <option value="off">off</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rules-menu-section">
        <h2>Rules by Category</h2>
        {Object.entries(RULES_BY_CATEGORY).map(([categoryName, rules]) => (
          <div key={categoryName} className="rules-category-block">
            <h3 className="rules-category-title">{categoryName}</h3>
            <div className="rules-menu-list">
              {rules.map((ruleName) => {
                const currentValue =
                  config.rules?.[ruleName] ||
                  config.categories?.[categoryName] ||
                  "off";
                return (
                  <div key={ruleName} className="rule-menu-item">
                    <span className="rule-menu-name">{ruleName}</span>
                    <select
                      value={currentValue}
                      onChange={(e) =>
                        updateRuleValue(ruleName, e.target.value)
                      }
                      className="rule-menu-select"
                      disabled={isLoading}
                    >
                      <option value="error">error</option>
                      <option value="warn">warn</option>
                      <option value="off">off</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
