import type { Action } from "./types.js";

export const OXLINT_VERSION = "1.42.0";
export const TSGOLINT_VERSION = "0.11.4";

export const KEY_MAP: Record<string, Action> = {
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
