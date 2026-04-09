import { spawn } from "node:child_process";
import type { AppSettings, ToolKind } from "../../../../contracts/contracts";
import { detectTools } from "../../../adapters/tools/tool-detection";

export function preferredTerminalTool(settings: AppSettings): ToolKind {
  const detected = detectTools();
  const preferred = settings.integrations.defaultTerminal;
  if (detected[preferred]?.isInstalled) return preferred;
  if (detected.ghostty?.isInstalled) return "ghostty";
  if (detected.iTerm?.isInstalled) return "iTerm";
  return "terminal";
}

export function openEditor(target: string, tool: ToolKind) {
  const availability = detectTools()[tool];
  if (availability?.executablePath) {
    spawn(availability.executablePath, [target], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (availability?.appPath) {
    spawn("/usr/bin/open", ["-a", availability.appPath, "--args", target], { detached: true, stdio: "ignore" }).unref();
  }
}

export function openInTerminal(directory: string, settings: AppSettings) {
  const preferred = preferredTerminalTool(settings);
  const availability = detectTools()[preferred];
  if (availability?.appPath) {
    spawn("/usr/bin/open", ["-a", availability.appPath, directory], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("/usr/bin/open", ["-a", "Terminal", directory], { detached: true, stdio: "ignore" }).unref();
}

export function openWithCustomApp(targets: string[], appPath: string) {
  if (targets.length === 0) return;
  spawn("/usr/bin/open", ["-a", appPath, ...targets], { detached: true, stdio: "ignore" }).unref();
}

export function openInGhostty(directory: string): boolean {
  const availability = detectTools().ghostty;
  if (availability?.appPath) {
    spawn("/usr/bin/open", ["-a", availability.appPath, directory], { detached: true, stdio: "ignore" }).unref();
    return true;
  }
  if (availability?.executablePath) {
    spawn(availability.executablePath, ["--working-directory", directory], { detached: true, stdio: "ignore" }).unref();
    return true;
  }
  return false;
}
