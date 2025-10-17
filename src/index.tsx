import { serve } from "bun";
import index from "./index.html";
const path = "./.oxlintrc.json";

const server = serve({
  routes: {
    "/*": index,
    "/config": {
      async GET() {
        // Always read fresh from file to ensure we have the latest state
        const file = Bun.file(path);
        const contents = await file.json();
        return Response.json({ contents });
      },
      async PUT(request) {
        try {
          const newConfig = await request.json();

          // Validate that it's a valid JSON object
          if (typeof newConfig !== "object" || newConfig === null) {
            return new Response("Invalid JSON object", { status: 400 });
          }

          // Write the new configuration to the file
          await Bun.write(path, JSON.stringify(newConfig, null, 2));

          // Read back from file to ensure we return exactly what was saved
          const updatedFile = Bun.file(path);
          const updatedContents = await updatedFile.json();

          return Response.json({
            message: "Configuration updated successfully",
            contents: updatedContents,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return new Response(`Error updating configuration: ${errorMessage}`, {
            status: 500,
          });
        }
      },
    },
    "/lint": {
      async GET() {
        const proc = Bun.spawn(["bun", "lint"], {
          stdout: "pipe",
          stderr: "pipe",
        });

        const output = await new Response(proc.stdout).text();
        const errorOutput = await new Response(proc.stderr).text();
        await proc.exited;

        // Extract the summary line that shows warnings and errors count
        const fullOutput = output + errorOutput;
        const summaryMatch = fullOutput.match(
          /Found (\d+) warnings? and (\d+) errors?/,
        );

        let summary = "No summary found";
        if (summaryMatch) {
          summary = summaryMatch[0]; // e.g., "Found 0 warnings and 6 errors"
        }

        return Response.json({
          summary,
          fullOutput: fullOutput, // Keep full output available if needed
        });
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
