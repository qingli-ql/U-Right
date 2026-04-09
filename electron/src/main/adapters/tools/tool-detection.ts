import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { ToolAvailability, ToolKind } from "../../../contracts/contracts";
import { TOOL_CATALOG, TOOL_CATALOG_BY_KIND } from "../../../contracts/tool-catalog";
import { getCustomExecutablePath } from "../../../contracts/resolved-settings";
import { loadSettings } from "../../application/settings/settings-repository";

const HOME = process.env.HOME ?? "";
const COMMON_BINARY_DIRS = [
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  "/usr/local/bin",
  "/usr/local/sbin",
  "/usr/bin",
  "/bin",
  path.join(HOME, ".local/bin"),
  path.join(HOME, ".bun/bin")
].filter(Boolean);

const APPLICATION_ROOTS = [
  "/Applications",
  "/Applications/Utilities",
  "/Applications/Setapp",
  "/System/Applications",
  "/System/Applications/Utilities",
  path.join(HOME, "Applications")
].filter(Boolean);

function safeExec(command: string, args: string[]): string | undefined {
  try {
    const output = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return output || undefined;
  } catch {
    return undefined;
  }
}

function which(binary: string): string | undefined {
  return safeExec("/usr/bin/which", [binary]);
}

function shellLocate(binary: string): string | undefined {
  return safeExec("/bin/zsh", ["-lc", `command -v ${binary}`]);
}

function searchCommonBinaryDirs(binary: string): string | undefined {
  for (const directory of COMMON_BINARY_DIRS) {
    const candidate = path.join(directory, binary);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function findBinary(kind: ToolKind, customPath?: string | null): string | undefined {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }
  const entry = TOOL_CATALOG_BY_KIND.get(kind);
  if (!entry) {
    return undefined;
  }
  for (const binary of entry.binaries) {
    const hit = which(binary) ?? searchCommonBinaryDirs(binary) ?? shellLocate(binary);
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

function findByBundleIdentifier(bundleIdentifier: string): string | undefined {
  const hit = safeExec("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == "${bundleIdentifier}"`]);
  if (!hit) {
    return undefined;
  }
  return hit.split("\n").find((item) => item.endsWith(".app"));
}

function findApp(kind: ToolKind): string | undefined {
  const entry = TOOL_CATALOG_BY_KIND.get(kind);
  if (!entry) {
    return undefined;
  }

  for (const appName of entry.appNames) {
    for (const root of APPLICATION_ROOTS) {
      const candidate = path.join(root, appName);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  for (const bundleIdentifier of entry.bundleIdentifiers) {
    const found = findByBundleIdentifier(bundleIdentifier);
    if (found) {
      return found;
    }
  }

  return undefined;
}

export function detectTools(): Record<ToolKind, ToolAvailability> {
  const settings = loadSettings();
  const result = {} as Record<ToolKind, ToolAvailability>;
  for (const entry of TOOL_CATALOG) {
    const customPath = getCustomExecutablePath(settings, entry.kind);
    const executablePath = findBinary(entry.kind, customPath);
    const appPath = findApp(entry.kind);
    result[entry.kind] = {
      kind: entry.kind,
      isInstalled: Boolean(executablePath || appPath),
      executablePath,
      appPath
    };
  }
  return result;
}
