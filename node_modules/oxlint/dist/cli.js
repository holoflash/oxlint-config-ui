import { n as lint } from "./bindings.js";
let loadPlugin = null, setupRuleConfigs = null, lintFile = null;
function loadPluginWrapper(path, pluginName, pluginNameIsAlias) {
	return loadPlugin === null ? import("./plugins.js").then((mod) => ({loadPlugin, lintFile, setupRuleConfigs} = mod, loadPlugin(path, pluginName, pluginNameIsAlias))) : loadPlugin(path, pluginName, pluginNameIsAlias);
}
function setupRuleConfigsWrapper(optionsJSON) {
	return setupRuleConfigs(optionsJSON);
}
function lintFileWrapper(filePath, bufferId, buffer, ruleIds, optionsIds, settingsJSON, globalsJSON) {
	return lintFile(filePath, bufferId, buffer, ruleIds, optionsIds, settingsJSON, globalsJSON);
}
await lint(process.argv.slice(2), loadPluginWrapper, setupRuleConfigsWrapper, lintFileWrapper) || (process.exitCode = 1);
export {};
