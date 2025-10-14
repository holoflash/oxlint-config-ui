import { createServer } from "http";
import path from "path";
import fs from "fs";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PORT = 3000;

const mimeTypes: Record<string, string> = {
  ".js": "application/javascript",
  ".html": "text/html",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const server = createServer((req, res) => {
  const parsedUrl = url.parse(req.url!, true);
  const pathname = parsedUrl.pathname || "/";

  if (pathname === "/config") {
    fs.readFile(path.join(__dirname, ".oxlintrc.json"), (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: false,
            error: "Could not read .oxlintrc.json",
          }),
        );
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          config: JSON.parse(data.toString()),
        }),
      );
    });
    return;
  }

  // Serve static files from dist
  const filePath = path.join(
    __dirname,
    "dist",
    pathname === "/" ? "index.html" : pathname,
  );
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath);
    const mimeType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
