import { app, clipboard, dialog, shell } from "electron";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ActionRequest, AppSettings, FinderActionContext, ResultWindowPayload, ToolKind } from "../../shared/contracts";
import { actionTitleFor, getRuntimeTemplateDefinitions } from "../../shared/action-registry";
import { refreshFinderWindows, toggleFinderHiddenFiles } from "../finder-view-actions";
import type { WindowController } from "../index";
import { saveSettings } from "../store";
import { detectTools } from "../tool-detection";

interface TemplateDefinition {
  id: string;
  title: string;
  fileNameSuggestion: string;
  fileExtension: string;
  starterContent: string;
  makeExecutable?: boolean;
}

interface ActionExecutionContext {
  request: ActionRequest;
  controller: WindowController;
  settings: AppSettings;
  scriptsDirectory: string;
  actionTitle: string;
}

type ActionHandler = (ctx: ActionExecutionContext) => Promise<boolean>;

const BUILT_IN_EMPTY_TEMPLATE: TemplateDefinition = {
  id: "empty",
  title: "Empty File...",
  fileNameSuggestion: "untitled",
  fileExtension: "",
  starterContent: ""
};

function resolveLocalPath(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("file://")) {
    try { return fileURLToPath(value); } catch { return null; }
  }
  return value;
}

function selectedPaths(context: FinderActionContext): string[] {
  return context.selectedURLs.map((value) => resolveLocalPath(value)).filter((value): value is string => Boolean(value));
}

function resolvedTargetDirectory(context: FinderActionContext): string | null {
  return resolveLocalPath(context.resolvedTargetDirectory);
}

function resolvedSelectionDirectory(context: FinderActionContext): string | null {
  return resolveLocalPath(context.resolvedSelectionDirectory);
}

function primaryPath(context: FinderActionContext): string | null {
  return resolveLocalPath(context.resolvedPrimaryTarget) ?? resolveLocalPath(context.primaryURL);
}

function singleTargetPath(context: FinderActionContext): string | null {
  const primary = primaryPath(context);
  if (primary) return primary;
  const selected = selectedPaths(context);
  return selected.length === 1 ? selected[0] : null;
}

function directoryPath(context: FinderActionContext): string | null {
  const target = resolvedTargetDirectory(context);
  if (target) return target;
  const current = resolveLocalPath(context.currentDirectoryURL);
  if (current) return current;
  if (context.selectionKind === "folder") return primaryPath(context);
  const primary = primaryPath(context);
  return primary ? path.dirname(primary) : null;
}

function viewDirectoryPath(context: FinderActionContext): string | null {
  return resolvedSelectionDirectory(context)
    ?? resolvedTargetDirectory(context)
    ?? directoryPath(context);
}

function actionTargets(context: FinderActionContext): string[] {
  const selected = selectedPaths(context);
  if (selected.length > 0) return selected;
  const directory = directoryPath(context);
  return directory ? [directory] : [];
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\/:\0]/g, "-").trim();
}

function ensureFileNameWithExtension(name: string, fileExtension: string): string {
  if (!fileExtension) return name;
  return name.toLowerCase().endsWith(`.${fileExtension.toLowerCase()}`) ? name : `${name}.${fileExtension}`;
}

function nextDuplicatePath(target: string): string {
  const directory = path.dirname(target);
  const parsed = path.parse(target);
  const stem = parsed.ext ? parsed.name : parsed.base;
  const extension = parsed.ext;
  let candidate = path.join(directory, `${stem} copy${extension}`);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${stem} copy ${index}${extension}`);
    index += 1;
  }
  return candidate;
}

function relativePath(base: string | null, target: string): string {
  if (!base) return target;
  const relative = path.relative(base, target);
  return relative.length > 0 ? relative : ".";
}

function isExecutableFile(target: string): boolean {
  try { fs.accessSync(target, fs.constants.X_OK); return true; } catch { return false; }
}

async function ensureWritableDirectory(directory: string): Promise<boolean> {
  try { fs.accessSync(directory, fs.constants.W_OK); return true; } catch { return false; }
}

async function ensureWritableExistingTarget(target: string): Promise<boolean> {
  const writablePath = fs.existsSync(target) && fs.statSync(target).isDirectory() ? target : path.dirname(target);
  try { fs.accessSync(writablePath, fs.constants.W_OK); return true; } catch { return false; }
}

async function ensureWritableFile(target: string): Promise<boolean> {
  try { fs.accessSync(target, fs.constants.W_OK); return true; } catch { return false; }
}

async function promptForValue(
  controller: WindowController,
  options: {
    title: string;
    message: string;
    defaultValue: string;
    mode?: "singleline" | "multiline";
    submitLabel?: string;
    variant?: "compact" | "full";
    placeholder?: string;
  }
): Promise<string | null> {
  return controller.openPrompt({
    title: options.title,
    message: options.message,
    defaultValue: options.defaultValue,
    mode: options.mode ?? "singleline",
    submitLabel: options.submitLabel ?? "Continue",
    variant: options.variant ?? ((options.mode ?? "singleline") === "singleline" ? "compact" : "full"),
    placeholder: options.placeholder
  });
}

async function confirmAction(options: { title: string; message: string; destructive?: boolean }): Promise<boolean> {
  const result = await dialog.showMessageBox({
    type: options.destructive ? "warning" : "question",
    title: options.title,
    message: options.message,
    buttons: ["Continue", "Cancel"],
    defaultId: 1,
    cancelId: 1
  });
  return result.response === 0;
}

function preferredTerminalTool(settings: AppSettings): ToolKind {
  const detected = detectTools();
  const preferred = settings.integrations.defaultTerminal;
  if (detected[preferred]?.isInstalled) return preferred;
  if (detected.ghostty?.isInstalled) return "ghostty";
  if (detected.iTerm?.isInstalled) return "iTerm";
  return "terminal";
}

function openEditor(target: string, tool: ToolKind) {
  const availability = detectTools()[tool];
  if (availability?.executablePath) {
    spawn(availability.executablePath, [target], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (availability?.appPath) {
    spawn("/usr/bin/open", ["-a", availability.appPath, target], { detached: true, stdio: "ignore" }).unref();
  }
}

function openInTerminal(directory: string, settings: AppSettings) {
  const preferred = preferredTerminalTool(settings);
  const availability = detectTools()[preferred];
  if (availability?.appPath) {
    spawn("/usr/bin/open", ["-a", availability.appPath, directory], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("/usr/bin/open", ["-a", "Terminal", directory], { detached: true, stdio: "ignore" }).unref();
}

function openWithCustomApp(targets: string[], appPath: string) {
  if (targets.length === 0) return;
  spawn("/usr/bin/open", ["-a", appPath, ...targets], { detached: true, stdio: "ignore" }).unref();
}

function templateForAction(settings: AppSettings, actionID: string): TemplateDefinition | undefined {
  const templateID = actionID.replace(/^create\.template\./, "");
  const runtime = getRuntimeTemplateDefinitions(settings).find((template) => template.id === templateID);
  if (!runtime) return undefined;
  return {
    id: runtime.id,
    title: runtime.title,
    fileNameSuggestion: runtime.fileNameSuggestion,
    fileExtension: runtime.fileExtension,
    starterContent: runtime.starterContent,
    makeExecutable: runtime.makeExecutable
  };
}

function scriptPathForAction(actionID: string, scriptsDirectory: string): string | null {
  const scriptName = actionID.replace(/^script\.run\./, "");
  const scriptPath = path.join(scriptsDirectory, scriptName);
  return fs.existsSync(scriptPath) ? scriptPath : null;
}

function streamCommandToResult(
  controller: WindowController,
  options: {
    title: string;
    command: string;
    args: string[];
    cwd?: string | null;
    suggestedFilePath?: string | null;
  }
) {
  const resultWindow = controller.openResult({
    title: options.title,
    markdown: "",
    canApplyToFile: false,
    suggestedFilePath: options.suggestedFilePath ?? null,
    workingDirectory: options.cwd ?? null
  });
  const child = spawn(options.command, options.args, { cwd: options.cwd ?? app.getPath("home") });
  child.stdout.on("data", (chunk) => controller.appendResult(resultWindow, String(chunk)));
  child.stderr.on("data", (chunk) => controller.appendResult(resultWindow, `\n[stderr]\n${String(chunk)}`));
}

function summarizeContext(context: FinderActionContext): string {
  if (context.selectionKind === "file" && context.primaryURL) return `File: ${context.primaryURL}`;
  if ((context.selectionKind === "folder" || context.selectionKind === "empty") && (context.primaryURL || context.currentDirectoryURL)) {
    return `Directory: ${context.primaryURL ?? context.currentDirectoryURL}`;
  }
  return context.selectedURLs.join("\n");
}

async function runAIAction(ctx: ActionExecutionContext): Promise<boolean> {
  if (!ctx.settings.ai.enabled) {
    await dialog.showMessageBox({ type: "error", title: "U-Right", message: "AI 功能已在设置中禁用。" });
    return true;
  }

  const activePolicy = ctx.settings.ai.promptPolicies.find((item) => item.id === ctx.settings.ai.defaultPromptPolicyID)
    ?? ctx.settings.ai.promptPolicies[0];
  const title = ctx.request.actionID === "ai.ask-codex" ? "Ask Codex About This" : "Ask Claude About This";
  const editedPrompt = await promptForValue(ctx.controller, {
    title,
    message: "发送前可编辑提示词",
    defaultValue: `${activePolicy?.systemPromptTemplate ?? ""}\n\nContext:\n${summarizeContext(ctx.request.context)}`,
    mode: "multiline",
    submitLabel: "Send"
  });
  if (!editedPrompt) return true;

  saveSettings({
    ...ctx.settings,
    lastAIActionID: ctx.request.actionID,
    recentActionIDs: [ctx.request.actionID, ...ctx.settings.recentActionIDs.filter((id) => id !== ctx.request.actionID)].slice(0, 12)
  });

  const resultWindow = ctx.controller.openResult({
    title,
    markdown: "",
    canApplyToFile: ctx.request.context.selectionKind === "file" && Boolean(ctx.request.context.primaryURL),
    suggestedFilePath: primaryPath(ctx.request.context),
    workingDirectory: directoryPath(ctx.request.context) ?? primaryPath(ctx.request.context)
  });

  const tools = detectTools();
  const binary = ctx.request.actionID === "ai.ask-codex" ? tools.codex?.executablePath : tools.claude?.executablePath;
  if (!binary) {
    ctx.controller.appendResult(resultWindow, "CLI 不可用，请先安装 Claude/Codex CLI。");
    return true;
  }

  const args = ctx.request.actionID === "ai.ask-codex" ? ["exec", editedPrompt] : ["--print", editedPrompt];
  const child = spawn(binary, args, { cwd: directoryPath(ctx.request.context) ?? app.getPath("home") });
  child.stdout.on("data", (chunk) => ctx.controller.appendResult(resultWindow, String(chunk)));
  child.stderr.on("data", (chunk) => ctx.controller.appendResult(resultWindow, `\n[stderr]\n${String(chunk)}`));
  return true;
}

const directHandlers: Record<string, ActionHandler> = {
  "copy.path": async (ctx) => {
    clipboard.writeText(actionTargets(ctx.request.context).join("\n"));
    return true;
  },
  "copy.relative-path": async (ctx) => {
    const base = directoryPath(ctx.request.context);
    clipboard.writeText(actionTargets(ctx.request.context).map((item) => relativePath(base, item)).join("\n"));
    return true;
  },
  "copy.filename": async (ctx) => {
    const target = singleTargetPath(ctx.request.context);
    if (!target) return true;
    clipboard.writeText(path.basename(target));
    return true;
  },
  "copy.basename": async (ctx) => {
    const target = singleTargetPath(ctx.request.context);
    if (!target) return true;
    const parsed = path.parse(target);
    clipboard.writeText(parsed.ext ? parsed.name : parsed.base);
    return true;
  },
  "copy.extension": async (ctx) => {
    const target = singleTargetPath(ctx.request.context);
    if (!target) return true;
    const parsed = path.parse(target);
    clipboard.writeText(parsed.ext.startsWith(".") ? parsed.ext.slice(1) : parsed.ext);
    return true;
  },
  "create.new-file": async (ctx) => {
    const directory = resolvedTargetDirectory(ctx.request.context) ?? directoryPath(ctx.request.context) ?? primaryPath(ctx.request.context);
    if (!directory || !await ensureWritableDirectory(directory)) return true;
    const requested = await promptForValue(ctx.controller, {
      title: BUILT_IN_EMPTY_TEMPLATE.title,
      message: "输入文件名",
      defaultValue: BUILT_IN_EMPTY_TEMPLATE.fileNameSuggestion,
      variant: "compact"
    });
    if (!requested) return true;
    const sanitized = sanitizeFileName(requested);
    if (!sanitized) return true;
    const target = path.join(directory, sanitized);
    fs.writeFileSync(target, "", "utf8");
    shell.showItemInFolder(target);
    return true;
  },
  "create.new-folder": async (ctx) => {
    const directory = resolvedTargetDirectory(ctx.request.context) ?? directoryPath(ctx.request.context) ?? primaryPath(ctx.request.context);
    if (!directory || !await ensureWritableDirectory(directory)) return true;
    const requested = await promptForValue(ctx.controller, { title: "New Folder", message: "输入文件夹名称", defaultValue: "New Folder", variant: "compact" });
    if (!requested) return true;
    const sanitized = sanitizeFileName(requested);
    if (!sanitized) return true;
    fs.mkdirSync(path.join(directory, sanitized), { recursive: false });
    return true;
  },
  "open.terminal": async (ctx) => {
    const directory = resolvedSelectionDirectory(ctx.request.context) ?? directoryPath(ctx.request.context) ?? primaryPath(ctx.request.context);
    if (directory) openInTerminal(directory, ctx.settings);
    return true;
  },
  "open.vscode": async (ctx) => {
    const target = primaryPath(ctx.request.context) ?? directoryPath(ctx.request.context);
    if (target) openEditor(target, "vscode");
    return true;
  },
  "open.cursor": async (ctx) => {
    const target = primaryPath(ctx.request.context) ?? directoryPath(ctx.request.context);
    if (target) openEditor(target, "cursor");
    return true;
  },
  "open.zed": async (ctx) => {
    const target = primaryPath(ctx.request.context) ?? directoryPath(ctx.request.context);
    if (target) openEditor(target, "zed");
    return true;
  },
  "finder.reveal": async (ctx) => {
    const targets = actionTargets(ctx.request.context);
    if (targets.length > 0) shell.showItemInFolder(targets[0]);
    return true;
  },
  "file.rename": async (ctx) => {
    const target = primaryPath(ctx.request.context);
    if (!target || !await ensureWritableExistingTarget(target)) return true;
    const nextName = await promptForValue(ctx.controller, { title: "Rename", message: "输入新名称", defaultValue: path.basename(target), variant: "compact" });
    if (!nextName) return true;
    const sanitized = sanitizeFileName(nextName);
    if (!sanitized) return true;
    fs.renameSync(target, path.join(path.dirname(target), sanitized));
    return true;
  },
  "file.trash": async (ctx) => {
    const targets = actionTargets(ctx.request.context);
    if (targets.length === 0) return true;
    const confirmed = await confirmAction({ title: "Move to Trash", message: `这会把 ${targets.length} 个目标移到废纸篓，是否继续？`, destructive: true });
    if (!confirmed) return true;
    for (const target of targets) await shell.trashItem(target);
    return true;
  },
  "file.duplicate": async (ctx) => {
    for (const target of actionTargets(ctx.request.context)) {
      if (!await ensureWritableExistingTarget(target)) return true;
      const copyTarget = nextDuplicatePath(target);
      const stat = fs.statSync(target);
      if (stat.isDirectory()) fs.cpSync(target, copyTarget, { recursive: true });
      else fs.copyFileSync(target, copyTarget);
    }
    return true;
  },
  "file.compress": async (ctx) => {
    const targets = actionTargets(ctx.request.context);
    if (targets.length === 0) return true;
    const first = targets[0];
    const archiveName = `${path.parse(first).name}.zip`;
    execFileSync("/usr/bin/zip", ["-r", archiveName, ...targets.map((target) => path.basename(target))], {
      cwd: path.dirname(first),
      stdio: "ignore"
    });
    shell.showItemInFolder(path.join(path.dirname(first), archiveName));
    return true;
  },
  "file.json-format": async (ctx) => {
    const target = primaryPath(ctx.request.context);
    if (!target || !await ensureWritableFile(target)) return true;
    const content = fs.readFileSync(target, "utf8");
    fs.writeFileSync(target, `${JSON.stringify(JSON.parse(content), null, 2)}\n`, "utf8");
    return true;
  },
  "file.toggle-executable": async (ctx) => {
    const target = primaryPath(ctx.request.context);
    if (!target || !await ensureWritableFile(target)) return true;
    const current = fs.statSync(target).mode & 0o777;
    const next = (current & 0o111) === 0 ? (current | 0o755) : (current & ~0o111);
    fs.chmodSync(target, next);
    return true;
  },
  "git.status": async (ctx) => {
    const cwd = resolvedTargetDirectory(ctx.request.context) ?? directoryPath(ctx.request.context) ?? primaryPath(ctx.request.context);
    if (!cwd) return true;
    streamCommandToResult(ctx.controller, {
      title: "Git Status",
      command: "/usr/bin/env",
      args: ["git", "status", "--short", "--branch"],
      cwd
    });
    return true;
  },
  "ai.ask-claude": runAIAction,
  "ai.ask-codex": runAIAction,
  "view.refresh": async (ctx) => {
    const result = await refreshFinderWindows({ directoryPath: viewDirectoryPath(ctx.request.context), activateFinder: true });
    if (!result.ok) throw new Error(result.errorMessage ?? result.message);
    return true;
  },
  "view.toggle-hidden": async (ctx) => {
    const directory = viewDirectoryPath(ctx.request.context);
    if (!directory) throw new Error("missing directory context");
    const result = await toggleFinderHiddenFiles({ directoryPath: directory, activateFinder: true });
    if (!result.ok) throw new Error(result.errorMessage ?? result.message);
    return true;
  }
};

const prefixHandlers: ActionHandler[] = [
  async (ctx) => {
    if (!ctx.request.actionID.startsWith("create.template.")) return false;
    const template = templateForAction(ctx.settings, ctx.request.actionID);
    if (!template) throw new Error(`template not found: ${ctx.request.actionID}`);
    const directory = resolvedTargetDirectory(ctx.request.context) ?? directoryPath(ctx.request.context) ?? primaryPath(ctx.request.context);
    if (!directory || !await ensureWritableDirectory(directory)) return true;
    const target = path.join(directory, ensureFileNameWithExtension(template.fileNameSuggestion, template.fileExtension));
    fs.writeFileSync(target, template.starterContent, "utf8");
    if (template.makeExecutable) fs.chmodSync(target, 0o755);
    shell.showItemInFolder(target);
    return true;
  },
  async (ctx) => {
    if (!ctx.request.actionID.startsWith("open.custom.")) return false;
    const customID = ctx.request.actionID.replace(/^open\.custom\./, "");
    const customAction = ctx.settings.customActions.openActions.find((item) => item.id === customID && item.isEnabled);
    if (!customAction?.appPath) throw new Error(`custom app not found: ${ctx.request.actionID}`);
    openWithCustomApp(actionTargets(ctx.request.context), customAction.appPath);
    return true;
  },
  async (ctx) => {
    if (!ctx.request.actionID.startsWith("script.run.")) return false;
    const scriptPath = scriptPathForAction(ctx.request.actionID, ctx.scriptsDirectory);
    if (!scriptPath) throw new Error(`script not found: ${ctx.request.actionID}`);
    const cwd = resolvedSelectionDirectory(ctx.request.context) ?? directoryPath(ctx.request.context) ?? path.dirname(scriptPath);
    const executable = isExecutableFile(scriptPath);
    const args = executable ? actionTargets(ctx.request.context) : [scriptPath, ...actionTargets(ctx.request.context)];
    const command = executable ? scriptPath : "/bin/zsh";
    streamCommandToResult(ctx.controller, {
      title: `Script: ${path.basename(scriptPath)}`,
      command,
      args,
      cwd
    });
    return true;
  }
];

export async function dispatchActionRequest(
  request: ActionRequest,
  controller: WindowController,
  settings: AppSettings,
  scriptsDirectory: string
) {
  const ctx: ActionExecutionContext = {
    request,
    controller,
    settings,
    scriptsDirectory,
    actionTitle: actionTitleFor(request.actionID)
  };

  const direct = directHandlers[request.actionID];
  if (direct) {
    await direct(ctx);
    return;
  }

  for (const handler of prefixHandlers) {
    const handled = await handler(ctx);
    if (handled) return;
  }

  await dialog.showMessageBox({
    type: "info",
    title: "U-Right",
    message: `动作 ${request.actionID} 尚未实现。`
  });
}
