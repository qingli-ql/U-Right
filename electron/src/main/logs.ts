import fs from "node:fs";
import type { LogEntry } from "./types";
import { getSharedPaths } from "./store";

export function loadLogs(): LogEntry[] {
  const { logFile } = getSharedPaths();
  if (!fs.existsSync(logFile)) {
    return [];
  }
  const lines = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean);
  return lines.map((line, index) => ({
    id: `${index}-${line.slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    level: line.match(/\[(.*?)\]/)?.[1] ?? "info",
    subsystem: line.split(" ").slice(1, 2).join("") || "host",
    message: line
  }));
}
