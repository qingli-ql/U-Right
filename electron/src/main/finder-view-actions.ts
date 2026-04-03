import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type FinderViewScope = "finder-window" | "finder-global-preference";

export interface FinderViewResult {
  ok: boolean;
  changed: boolean;
  scope: FinderViewScope;
  targetDirectory: string | null;
  message: string;
  error?: string;
  errorMessage?: string;
  details?: Record<string, boolean | number | string | null>;
}

export interface RefreshFinderWindowOptions {
  directoryPath?: string | null;
  activateFinder?: boolean;
}

export interface ToggleFinderGlobalHiddenFilesOptions {
  directoryPath: string;
  desiredVisible?: boolean;
  activateFinder?: boolean;
}

function buildResult(input: FinderViewResult): FinderViewResult {
  return input;
}

function normalizeDirectoryPath(directoryPath?: string | null): string | null {
  if (!directoryPath) {
    return null;
  }

  const normalized = path.resolve(directoryPath);
  if (!fs.existsSync(normalized)) {
    throw new Error(`目录不存在：${normalized}`);
  }

  const stat = fs.statSync(normalized);
  if (!stat.isDirectory()) {
    throw new Error(`目标不是目录：${normalized}`);
  }

  return normalized;
}

async function runCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

async function runAppleScript(script: string, args: string[] = []) {
  return runCommand("/usr/bin/osascript", ["-e", script, ...args]);
}

function parseFinderHiddenFilesValue(rawValue: string | null | undefined): boolean {
  const normalized = rawValue?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

async function readFinderHiddenFilesVisible(): Promise<boolean> {
  try {
    const { stdout } = await runCommand("/usr/bin/defaults", ["read", "com.apple.finder", "AppleShowAllFiles"]);
    return parseFinderHiddenFilesValue(stdout);
  } catch {
    return false;
  }
}

async function writeFinderHiddenFilesVisible(visible: boolean) {
  await runCommand("/usr/bin/defaults", ["write", "com.apple.finder", "AppleShowAllFiles", "-bool", visible ? "true" : "false"]);
}

async function relaunchFinder() {
  try {
    await runCommand("/usr/bin/killall", ["Finder"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("No matching processes")) {
      throw error;
    }
  }
}

function refreshFinderScript() {
  return `
on run argv
  set targetPath to ""
  set shouldActivate to false
  if (count of argv) > 0 then set targetPath to item 1 of argv
  if (count of argv) > 1 then set shouldActivate to (item 2 of argv) is "true"

  tell application "Finder"
    set refreshedCount to 0

    if targetPath is not "" then
      set targetAlias to POSIX file targetPath as alias
      if (count of Finder windows) is 0 then
        make new Finder window to targetAlias
      else
        set target of front Finder window to targetAlias
      end if
      update (target of front Finder window)
      set refreshedCount to 1
    else
      repeat with currentWindow in every Finder window
        update (target of currentWindow)
        set refreshedCount to refreshedCount + 1
      end repeat

      if refreshedCount is 0 then
        reopen
      end if
    end if

    if shouldActivate then activate
    return refreshedCount as text
  end tell
end run
`;
}

async function revealDirectoryInFinder(directoryPath: string, activateFinder: boolean) {
  const script = `
on run argv
  set targetPath to item 1 of argv
  set shouldActivate to (item 2 of argv) is "true"

  tell application "Finder"
    set targetAlias to POSIX file targetPath as alias
    if (count of Finder windows) is 0 then
      make new Finder window to targetAlias
    else
      set target of front Finder window to targetAlias
    end if
    if shouldActivate then activate
    return POSIX path of (target of front Finder window as alias)
  end tell
end run
`;

  return runAppleScript(script, [directoryPath, activateFinder ? "true" : "false"]);
}

export async function refreshFinderView(options: RefreshFinderWindowOptions = {}): Promise<FinderViewResult> {
  try {
    const targetDirectory = normalizeDirectoryPath(options.directoryPath);
    const activateFinder = options.activateFinder ?? true;
    const { stdout } = await runAppleScript(refreshFinderScript(), [
      targetDirectory ?? "",
      activateFinder ? "true" : "false"
    ]);
    const refreshedWindowCount = Number.parseInt(stdout, 10);

    return buildResult({
      ok: true,
      changed: true,
      scope: "finder-window",
      targetDirectory,
      message: targetDirectory
        ? `已刷新 Finder 中与该目录相关的窗口：${targetDirectory}`
        : "已请求刷新 Finder 窗口。",
      details: {
        refreshedWindowCount: Number.isNaN(refreshedWindowCount) ? 0 : refreshedWindowCount,
        activateFinder
      }
    });
  } catch (error) {
    const targetDirectory = options.directoryPath ? path.resolve(options.directoryPath) : null;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return buildResult({
      ok: false,
      changed: false,
      scope: "finder-window",
      targetDirectory,
      message: "刷新 Finder 窗口失败。",
      error: errorMessage,
      errorMessage,
      details: {
        activateFinder: options.activateFinder ?? true
      }
    });
  }
}

export async function toggleFinderGlobalHiddenFiles(options: ToggleFinderGlobalHiddenFilesOptions): Promise<FinderViewResult> {
  let targetDirectory: string | null = null;

  try {
    targetDirectory = normalizeDirectoryPath(options.directoryPath);
    if (!targetDirectory) {
      throw new Error("缺少目标目录。");
    }
    const activateFinder = options.activateFinder ?? true;
    const currentVisible = await readFinderHiddenFilesVisible();
    const nextVisible = options.desiredVisible ?? !currentVisible;

    if (nextVisible === currentVisible) {
      await revealDirectoryInFinder(targetDirectory, activateFinder);
      await refreshFinderView({ directoryPath: targetDirectory, activateFinder });

      return buildResult({
        ok: true,
        changed: false,
        scope: "finder-global-preference",
        targetDirectory,
        message: nextVisible ? "Finder 全局隐藏文件显示已经开启。" : "Finder 全局隐藏文件显示已经关闭。",
        details: {
          visible: nextVisible,
          activateFinder,
          affectsFinderGlobalPreference: true
        }
      });
    }

    await writeFinderHiddenFilesVisible(nextVisible);
    await relaunchFinder();
    await revealDirectoryInFinder(targetDirectory, activateFinder);
    await refreshFinderView({ directoryPath: targetDirectory, activateFinder });

    return buildResult({
      ok: true,
      changed: true,
      scope: "finder-global-preference",
      targetDirectory,
      message: nextVisible
        ? `已开启 Finder 全局隐藏文件显示，并定位到目录：${targetDirectory}`
        : `已关闭 Finder 全局隐藏文件显示，并定位到目录：${targetDirectory}`,
      details: {
        previousVisible: currentVisible,
        visible: nextVisible,
        activateFinder,
        affectsFinderGlobalPreference: true
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return buildResult({
      ok: false,
      changed: false,
      scope: "finder-global-preference",
      targetDirectory: targetDirectory ?? path.resolve(options.directoryPath),
      message: "切换 Finder 隐藏文件显示失败。",
      error: errorMessage,
      errorMessage,
      details: {
        requestedVisible: options.desiredVisible ?? null,
        activateFinder: options.activateFinder ?? true,
        affectsFinderGlobalPreference: true
      }
    });
  }
}

export const refreshFinderWindows = refreshFinderView;
export const toggleFinderHiddenFiles = toggleFinderGlobalHiddenFiles;
