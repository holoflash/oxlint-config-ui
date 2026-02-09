import readline from "readline";
import { stdin } from "node:process";
import type { Action } from "../types.js";
import { executeAction } from "./actions.js";

const KEY_MAP: Record<string, Action> = {
  k: { type: "MOVE_UP" },
  up: { type: "MOVE_UP" },
  down: { type: "MOVE_DOWN" },
  j: { type: "MOVE_DOWN" },
  left: { type: "MOVE_LEFT" },
  h: { type: "MOVE_LEFT" },
  right: { type: "MOVE_RIGHT" },
  l: { type: "MOVE_RIGHT" },
  return: { type: "OPEN_DOCS" },
  enter: { type: "OPEN_DOCS" },
  "1": { type: "SET_STATUS", value: "off" },
  "2": { type: "SET_STATUS", value: "warn" },
  "3": { type: "SET_STATUS", value: "error" },
  q: { type: "EXIT" },
  r: { type: "RUN_LINT" },
  x: { type: "RUN_SINGLE_RULE" },
  a: { type: "RUN_ALL_RULES" },
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
