import { a as loadPlugin, c as getErrorMessage, d as setOptions, n as lintFile } from "./lint.js";
function setupRuleConfigs(optionsJSON) {
	try {
		return setOptions(optionsJSON), null;
	} catch (err) {
		return getErrorMessage(err);
	}
}
export { lintFile, loadPlugin, setupRuleConfigs };
