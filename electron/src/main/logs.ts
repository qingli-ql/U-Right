import fs from "node:fs";
import type { LogEntry } from "./types";
import { getSharedPaths } from "./store";

export function appendLog(level: string, subsystem: string, message: string) {
  const { logFile } = getSharedPaths();
  const line = `${new Date().toISOString()} [${level}] [${subsystem}] ${message}\n`;
  fs.appendFileSync(logFile, line, "utf8");
}

function parseLogLine(line: string, index: number): LogEntry {
  const match = line.match(/^(\S+)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/);
  if (!match) {
    return {
      id: `${index}-${line.slice(0, 24)}`,
      timestamp: "",
      level: "INFO",
      subsystem: "host",
      message: line
    };
  }

  const [, timestamp, level, subsystem, message] = match;
  return {
    id: `${index}-${timestamp}-${subsystem}`,
    timestamp,
    level,
    subsystem,
    message
  };
}

export function loadLogs(): LogEntry[] {
  const { logFile } = getSharedPaths();
  if (!fs.existsSync(logFile)) {
    return [];
  }
  const lines = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean);
  return lines.map(parseLogLine);
}

export function clearLogs() {
  const { logFile } = getSharedPaths();
  fs.mkdirSync(getSharedPaths().root, { recursive: true });
  fs.writeFileSync(logFile, "", "utf8");
}
