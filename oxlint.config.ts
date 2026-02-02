import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["unicorn", "typescript", "oxc", "import", "promise", "node"],
  categories: { correctness: "error", perf: "error", suspicious: "error" },
});
