import express from "express";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const configPath = path.resolve("./.oxlintrc.json");

app.use(express.static(path.resolve(__dirname, "dist")));

app.get("/", async (_req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

app.get("/config", async (_req, res) => {
  try {
    const contents = await fs.readFile(configPath, "utf-8");
    res.json({ contents: JSON.parse(contents) });
  } catch (err) {
    res.status(500).json({ error: "Failed to read config" });
  }
});

app.put("/config", async (req, res) => {
  try {
    const newConfig = req.body;
    if (typeof newConfig !== "object" || newConfig === null) {
      return res.status(400).send("Invalid JSON object");
    }
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
    const updatedContents = await fs.readFile(configPath, "utf-8");
    res.json({
      message: "Configuration updated successfully",
      contents: JSON.parse(updatedContents),
    });
  } catch (error) {
    res.status(500).send(`Error updating configuration: ${error}`);
  }
});

app.get("/lint", (_req, res) => {
  exec("bun lint", (error, stdout, stderr) => {
    const fullOutput = stdout + stderr;
    const summaryMatch = fullOutput.match(
      /Found (\d+) warnings? and (\d+) errors?/,
    );
    let summary = "No summary found";
    if (summaryMatch) {
      summary = summaryMatch[0];
    }
    res.json({
      summary,
      fullOutput,
    });
  });
});

app.get("/rules", (_req, res) => {
  exec("oxlint --rules -f=json", (error, stdout, stderr) => {
    if (error) {
      console.error("Error running oxlint:", error);
      return res.status(500).send("Failed to get rules");
    }
    try {
      const rules = JSON.parse(stdout);
      res.json(rules);
    } catch (e) {
      res.status(500).send("Failed to parse rules JSON");
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
