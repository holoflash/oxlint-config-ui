import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: ["./src/index.ts"],
    format: ["esm"],
    target: "node18",
    clean: true,
    minify: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    plugins: ["unicorn", "typescript", "oxc", "import", "promise", "node"],
    categories: { correctness: "error", perf: "error", suspicious: "error" },
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: ["testconfig.json"],
  },
});
