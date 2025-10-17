import { useRef, useState, useEffect, type FormEvent } from "react";
import "./index.css";

interface OxlintConfig {
  $schema?: string;
  categories?: Record<string, string>;
  rules?: Record<string, string>;
  [key: string]: any;
}

export function App() {
  const responseInputRef = useRef<HTMLTextAreaElement>(null);
  const [config, setConfig] = useState<OxlintConfig>({});
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleValue, setNewRuleValue] = useState("error");
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

  const addRule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newRuleName.trim()) {
      alert("Please enter a rule name");
      return;
    }

    try {
      setIsLoading(true);
      const updatedConfig = {
        ...config,
        rules: {
          ...config.rules,
          [newRuleName]: newRuleValue,
        },
      };

      const res = await fetch("/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      const data = await res.json();

      if (res.ok) {
        // Update local state with the actual saved config
        setConfig(data.contents);
        setNewRuleName("");
        setNewRuleValue("error");

        // Automatically run lint to show updated results
        responseInputRef.current!.value = `Rule "${newRuleName}" added successfully! Running lint...`;
        await runLintAndDisplay();
      } else {
        responseInputRef.current!.value = `Error: ${data.message || (await res.text())}`;
        // Reload config on error to ensure we're in sync
        await loadConfig();
      }
    } catch (error) {
      responseInputRef.current!.value = `Error adding rule: ${error}`;
      // Reload config on error to ensure we're in sync
      await loadConfig();
    } finally {
      setIsLoading(false);
    }
  };

  // // IN PROGRESS
  // const removeRule = async (ruleName: string) => {
  //   try {
  //     setIsLoading(true);
  //     const updatedRules = { ...config.rules };
  //     delete updatedRules[ruleName];

  //     const updatedConfig = {
  //       ...config,
  //       rules: updatedRules,
  //     };

  //     const res = await fetch("/config", {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(updatedConfig),
  //     });

  //     const data = await res.json();

  //     if (res.ok) {
  //       // Update local state with the actual saved config
  //       setConfig(data.contents);

  //       // Automatically run lint to show updated results
  //       responseInputRef.current!.value = `Rule "${ruleName}" removed successfully! Running lint...`;
  //       await runLintAndDisplay();
  //     } else {
  //       responseInputRef.current!.value = `Error: ${data.message || (await res.text())}`;
  //       // Reload config on error to ensure we're in sync
  //       await loadConfig();
  //     }
  //   } catch (error) {
  //     responseInputRef.current!.value = `Error removing rule: ${error}`;
  //     // Reload config on error to ensure we're in sync
  //     await loadConfig();
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const updateRuleValue = async (ruleName: string, newValue: string) => {
  //   try {
  //     setIsLoading(true);
  //     const updatedConfig = {
  //       ...config,
  //       rules: {
  //         ...config.rules,
  //         [ruleName]: newValue,
  //       },
  //     };

  //     const res = await fetch("/config", {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(updatedConfig),
  //     });

  //     const data = await res.json();

  //     if (res.ok) {
  //       // Update local state with the actual saved config
  //       setConfig(data.contents);

  //       // Automatically run lint to show updated results
  //       responseInputRef.current!.value = `Rule "${ruleName}" updated to "${newValue}"! Running lint...`;
  //       await runLintAndDisplay();
  //     } else {
  //       responseInputRef.current!.value = `Error: ${data.message || (await res.text())}`;
  //       // Reload config on error to ensure we're in sync
  //       await loadConfig();
  //     }
  //   } catch (error) {
  //     responseInputRef.current!.value = `Error updating rule: ${error}`;
  //     // Reload config on error to ensure we're in sync
  //     await loadConfig();
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const updateCategory = async (categoryName: string, newValue: string) => {
    try {
      setIsLoading(true);
      const updatedCategories = { ...config.categories };
      updatedCategories[categoryName] = newValue;
      const updatedConfig = {
        ...config,
        categories: updatedCategories,
      };

      const res = await fetch("/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      const data = await res.json();

      if (res.ok) {
        // Update local state with the actual saved config
        setConfig(data.contents);

        // Automatically run lint to show updated results
        responseInputRef.current!.value = `Category "${categoryName}" updated to "${newValue}"! Running lint...`;
        await runLintAndDisplay();
      } else {
        responseInputRef.current!.value = `Error: ${data.message || (await res.text())}`;
        // Reload config on error to ensure we're in sync
        await loadConfig();
      }
    } catch (error) {
      responseInputRef.current!.value = `Error updating category: ${error}`;
      // Reload config on error to ensure we're in sync
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

      {/* {rulesFeatureIsEnabled && (
        <>
          <div className="add-rule-section">
            <h2>Add New Rule</h2>
            <form onSubmit={addRule} className="add-rule-form">
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Rule name (e.g. no-console, prefer-const)"
                className="rule-name-input"
                disabled={isLoading}
              />
              <select
                value={newRuleValue}
                onChange={(e) => setNewRuleValue(e.target.value)}
                className="rule-value-select"
                disabled={isLoading}
              >
                <option value="error">error</option>
                <option value="warn">warn</option>
                <option value="off">off</option>
              </select>
              <button
                type="submit"
                disabled={isLoading || !newRuleName.trim()}
                className="add-rule-btn"
              >
                Add Rule
              </button>
            </form>
          </div>

          <div className="current-rules-section">
            <h2>Current Rules ({Object.keys(config.rules || {}).length})</h2>
            {config.rules && Object.keys(config.rules).length > 0 ? (
              <div className="rules-list">
                {Object.entries(config.rules).map(([ruleName, ruleValue]) => (
                  <div key={ruleName} className="rule-item">
                    <span className="rule-name">{ruleName}</span>
                    <select
                      value={ruleValue}
                      onChange={(e) =>
                        updateRuleValue(ruleName, e.target.value)
                      }
                      className="rule-value-select-inline"
                      disabled={isLoading}
                    >
                      <option value="error">error</option>
                      <option value="warn">warn</option>
                      <option value="off">off</option>
                    </select>
                    <button
                      onClick={() => removeRule(ruleName)}
                      disabled={isLoading}
                      className="remove-rule-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-rules">
                No custom rules configured. Add some above!
              </p>
            )}
          </div>
        </>
      )} */}

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
    </div>
  );
}

export default App;
