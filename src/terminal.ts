import { stdout } from "node:process";

const write = (str: string): boolean => stdout.write(str);
export function enterAltScreen(): void {
  write("\x1b[?1049h\x1b[?25l");
}
export function exitAltScreen(): void {
  write("\x1b[?1049l\x1b[?25h");
}
export function clearScreen(): string {
  return "\x1b[H\x1b[J";
}
