import { Notice } from "obsidian";

// Single error policy for user-triggered async failures: log for debugging,
// notice so the failure isn't a silent dead click.
export function reportError(message: string, err: unknown): void {
  console.error(message, err);
  new Notice(message);
}
