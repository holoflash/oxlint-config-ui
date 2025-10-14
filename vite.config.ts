import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    preact(),
    {
      name: "serve-oxlintrc-json",
      configureServer(server) {
        server.middlewares.use("/config", (_, res) => {
          const configPath = path.join(process.cwd(), ".oxlintrc.json");
          fs.readFile(configPath, (err, data) => {
            res.setHeader("Content-Type", "application/json");
            if (err) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Could not read .oxlintrc.json",
                }),
              );
              return;
            }
            res.end(
              JSON.stringify({
                success: true,
                config: JSON.parse(data.toString()),
              }),
            );
          });
        });
      },
    },
  ],
});
