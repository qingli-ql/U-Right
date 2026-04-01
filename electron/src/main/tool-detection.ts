import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { ToolAvailability, ToolKind } from "../shared/contracts";
import { loadSettings } from "./store";

const APP_NAMES: Record<ToolKind, string[]> = {
  terminal: ["Terminal.app"],
  ghostty: ["Ghostty.app"],
  iTerm: ["iTerm.app", "iTerm2.app"],
  vscode: ["Visual Studio Code.app"],
  cursor: ["Cursor.app"],
  zed: ["Zed.app"],
  claude: ["Claude.app"],
  codex: ["Codex.app"],
  gh: ["GitUp.app"],
  lazygit: ["GitUp.app"],
  gitup: ["GitUp.app"]
};

const BINARIES: Record<ToolKind, string[]> = {
  terminal: ["open"],
  ghostty: ["ghostty"],
  iTerm: ["iterm2"],
  vscode: ["code"],
  cursor: ["cursor"],
  zed: ["zed"],
  claude: ["claude"],
  codex: ["codex"],
  gh: ["gh"],
  lazygit: ["lazygit"],
  gitup: ["gitup"]
};

function which(binary: string): string | undefined {
  try {
    return execFileSync("/usr/bin/which", [binary], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

function findApp(tool: ToolKind): string | undefined {
  const roots = ["/Applications", path.join(process.env.HOME ?? "", "Applications")];
  for (const appName of APP_NAMES[tool]) {
    for (const root of roots) {
      const candidate = path.join(root, appName);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

export function detectTools(): Record<ToolKind, ToolAvailability> {
  const settings = loadSettings();
  const result = {} as Record<ToolKind, ToolAvailability>;
  (Object.keys(BINARIES) as ToolKind[]).forEach((tool) => {
    const customPath = settings.customExecutablePaths[tool];
    const executablePath =
      customPath && fs.existsSync(customPath) ? customPath : BINARIES[tool].map(which).find(Boolean);
    const appPath = findApp(tool);
    result[tool] = {
      kind: tool,
      isInstalled: Boolean(executablePath || appPath),
      executablePath,
      appPath
    };
  });
  return result;
}
