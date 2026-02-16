import readline from "readline";
import { stdin } from "node:process";
import type { Action } from "../types.js";
import { executeAction } from "./actions.js";

const KEY_MAP: Record<string, Action> = {
  up: { type: "MOVE_UP" },
  down: { type: "MOVE_DOWN" },
  left: { type: "MOVE_LEFT" },
  right: { type: "MOVE_RIGHT" },
  "1": { type: "SET_SEVERITY", value: "off" },
  "2": { type: "SET_SEVERITY", value: "warn" },
  "3": { type: "SET_SEVERITY", value: "error" },
  a: { type: "RUN_ALL_RULES" },
  s: { type: "RUN_SELECTED" },
  t: { type: "RUN_LINT" },
  i: { type: "TOGGLE_INSIGHTS" },
  d: { type: "OPEN_DOCS" },
  q: { type: "EXIT" },
};

function mapKeyToAction(key: { name?: string; ctrl?: boolean; sequence?: string }): Action | null {
  if (key.name && KEY_MAP[key.name]) {
    return KEY_MAP[key.name];
  }

  if (key.ctrl && key.name === "c") {
    return { type: "EXIT" };
  }

  if (key.sequence && KEY_MAP[key.sequence]) {
    return KEY_MAP[key.sequence];
  }

  return null;
}

function handleKeypress(
  _: unknown,
  key: { name?: string; ctrl?: boolean; sequence?: string },
): void {
  const action = mapKeyToAction(key);
  executeAction(action);
}

export function setupKeyboardInput(): void {
  readline.emitKeypressEvents(stdin);

  if (stdin.isTTY) {
    stdin.setRawMode(true);
  }

  stdin.on("keypress", handleKeypress);
}
