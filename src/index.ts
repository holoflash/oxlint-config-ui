import { stdout } from "node:process";
import render, { ANSI } from "./rendering/index.js";
import { setupKeyboardInput } from "./interaction/input.js";
import { initializeState } from "./state.js";

function main(): void {
  initializeState();
  setupKeyboardInput();
  stdout.on("resize", render);
  stdout.write(ANSI.altScreenAndHideCursor);
  render();
}

main();
