import { useRef, useState, useEffect, useCallback } from "react";
import type { OxlintConfig, RuleLevel } from "../types/oxlint";

export function useOxlintConfig() {
  const responseInputRef = useRef<HTMLParagraphElement>(null);
  const [config, setConfig] = useState<OxlintConfig>({});
  const [isLoading, setIsLoading] = useState(false);

  const getRuleLevel = useCallback(
    (ruleName: string, categoryName: string): RuleLevel => {
      return (
        (config.rules?.[ruleName] as RuleLevel) ||
        (config.categories?.[categoryName] as RuleLevel) ||
        "off"
      );
    },
    [config.rules, config.categories],
  );

  const runLintAndDisplay = async () => {
    try {
      const res = await fetch("/lint");
      const data = await res.json();
      if (responseInputRef.current) {
        responseInputRef.current.textContent =
          data.summary || "No summary available";
      }
    } catch (error) {
      if (responseInputRef.current) {
        responseInputRef.current.textContent = `Error running oxlint: ${error}`;
      }
    }
  };

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/config");
      const data = await res.json();
      const loadedConfig = data.contents || {};
      setConfig(loadedConfig);

      if (responseInputRef.current) {
        responseInputRef.current.textContent =
          "Loading config and running oxlint...";
      }

      if (Object.keys(loadedConfig).length > 0) {
        await runLintAndDisplay();
      } else if (responseInputRef.current) {
        responseInputRef.current.textContent =
          "Config loaded, but it's empty. Not running oxlint.";
      }
    } catch (error) {
      if (responseInputRef.current) {
        responseInputRef.current.textContent = `Error loading config: ${error}`;
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    responseInputRef,
    config,
    setConfig,
    isLoading,
    setIsLoading,
    getRuleLevel,
    runLintAndDisplay,
    loadConfig,
  };
}
