import { stdout } from "node:process";
import { render } from "./rendering/render.js";
import { setupKeyboardInput } from "./interaction/input.js";
import { initializeState } from "./state.js";
import { ANSI } from "./config.js";

function main(): void {
  initializeState();
  setupKeyboardInput();
  stdout.on("resize", render);
  stdout.write(ANSI.altScreenAndHideCursor);
  render();
}

main();
