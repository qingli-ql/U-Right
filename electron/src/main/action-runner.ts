import { app, clipboard, dialog, shell } from "electron";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ActionRequest, AppSettings, FinderActionContext, ResultWindowPayload, ToolKind } from "../shared/contracts";
import { actionTitleFor } from "../shared/defaults";
import { getSharedPaths, loadSettings, saveSettings } from "./store";
import { detectTools } from "./tool-detection";
import type { WindowController } from "./index";
import { appendLog } from "./logs";

interface TemplateDefinition {
  id: string;
  title: string;
  fileNameSuggestion: string;
  fileExtension: string;
  starterContent: string;
  makeExecutable?: boolean;
}

const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  { id: "empty", title: "Empty File...", fileNameSuggestion: "untitled", fileExtension: "", starterContent: "" },
  { id: "text", title: "Text File", fileNameSuggestion: "notes", fileExtension: "txt", starterContent: "" },
  { id: "markdown", title: "Markdown File", fileNameSuggestion: "README", fileExtension: "md", starterContent: "# Title\n\n" },
  { id: "json", title: "JSON File", fileNameSuggestion: "data", fileExtension: "json", starterContent: "{\n  \"name\": \"value\"\n}\n" },
  {
    id: "python",
    title: "Python File",
    fileNameSuggestion: "main",
    fileExtension: "py",
    starterContent: "#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\n\ndef main() -> None:\n    print(\"Hello from U-Right\")\n\n\nif __name__ == \"__main__\":\n    main()\n",
    makeExecutable: true
  },
  {
    id: "shell",
    title: "Shell Script",
    fileNameSuggestion: "script",
    fileExtension: "sh",
    starterContent: "#!/bin/bash\nset -euo pipefail\n\n",
    makeExecutable: true
  },
  {
    id: "html",
    title: "HTML File",
    fileNameSuggestion: "index",
    fileExtension: "html",
    starterContent: "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <title>U-Right</title>\n</head>\n<body>\n</body>\n</html>\n"
  },
  { id: "css", title: "CSS File", fileNameSuggestion: "styles", fileExtension: "css", starterContent: ":root {\n  color-scheme: light dark;\n}\n" },
  { id: "javascript", title: "JavaScript File", fileNameSuggestion: "app", fileExtension: "js", starterContent: "console.log('Hello from U-Right');\n" },
  {
    id: "typescript",
    title: "TypeScript File",
    fileNameSuggestion: "app",
    fileExtension: "ts",
    starterContent: "export function main(): void {\n  console.log('Hello from U-Right');\n}\n\nmain();\n"
  },
  { id: "readme", title: "README.md", fileNameSuggestion: "README", fileExtension: "md", starterContent: "# Project\n\n## Overview\n\n" },
  { id: "gitignore", title: ".gitignore", fileNameSuggestion: ".gitignore", fileExtension: "", starterContent: ".DS_Store\nnode_modules/\n.build/\nDerivedData/\n" },
  { id: "env", title: ".env", fileNameSuggestion: ".env", fileExtension: "", starterContent: "# Environment variables\n" }
];

function summarizeContext(context: FinderActionContext, _settings: AppSettings): string {
  if (context.selectionKind === "file" && context.primaryURL) {
    return `File: ${context.primaryURL}`;
  }
  if ((context.selectionKind === "folder" || context.selectionKind === "empty") && (context.primaryURL || context.currentDirectoryURL)) {
    return `Directory: ${context.primaryURL ?? context.currentDirectoryURL}`;
  }
  return context.selectedURLs.join("\n");
}

function resolveLocalPath(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  if (value.startsWith("file://")) {
    try {
      return fileURLToPath(value);
    } catch {
      return null;
    }
  }
  return value;
}

function contextSelectedPaths(context: FinderActionContext): string[] {
  return context.selectedURLs.map((value) => resolveLocalPath(value)).filter((value): value is string => Boolean(value));
}

function contextPrimaryPath(context: FinderActionContext): string | null {
  return resolveLocalPath(context.primaryURL);
}

function contextDirectoryPath(context: FinderActionContext): string | null {
  const direct = resolveLocalPath(context.currentDirectoryURL);
  if (direct) {
    return direct;
  }
  if (context.selectionKind === "folder") {
    return contextPrimaryPath(context);
  }
  const primary = contextPrimaryPath(context);
  return primary ? path.dirname(primary) : null;
}

function actionTargetPaths(context: FinderActionContext): string[] {
  const selected = contextSelectedPaths(context);
  if (selected.length > 0) {
    return selected;
  }
  const directory = contextDirectoryPath(context);
  return directory ? [directory] : [];
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\/:\0]/g, "-").trim();
}

function relativePath(fromBase: string | null, toTarget: string): string {
  if (!fromBase) {
    return toTarget;
  }
  const relative = path.relative(fromBase, toTarget);
  return relative.length > 0 ? relative : ".";
}

function ensureFileNameWithExtension(name: string, fileExtension: string): string {
  if (!fileExtension) {
    return name;
  }
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

function isExecutableFile(target: string): boolean {
  try {
    fs.accessSync(target, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function buildPrompt(actionID: string, context: FinderActionContext, settings: AppSettings): { title: string; body: string } {
  const title = actionID === "ai.ask-codex" ? "Ask Codex About This" : "Ask Claude About This";
  const task = actionID === "ai.ask-codex"
    ? "Answer questions about the selected Finder context with concrete, implementation-oriented guidance."
    : "Help the user understand, summarize, or improve the selected Finder context.";
  const contextHint =
    context.selectionKind === "file"
      ? "Focus on the selected file. If the path suggests code or config, reason from likely file intent first."
      : context.selectionKind === "folder" || context.selectionKind === "empty"
        ? "Treat the target as a directory context. Prefer project structure, likely purpose, and next actions."
        : `Treat this as a multi-selection context with ${context.selectedURLs.length} selected items. Summarize patterns before diving into details.`;
  return {
    title,
    body: `${settings.systemPromptTemplate}\n\nTask:\n${task}\n\nGuidance:\n${contextHint}\n\nContext:\n${summarizeContext(context, settings)}`
  };
}

async function promptForValue(controller: WindowController, options: {
  title: string;
  message: string;
  defaultValue: string;
  mode?: "singleline" | "multiline";
  submitLabel?: string;
}) {
  return controller.openPrompt({
    title: options.title,
    message: options.message,
    defaultValue: options.defaultValue,
    mode: options.mode ?? "singleline",
    submitLabel: options.submitLabel ?? "Continue"
  });
}

async function confirmAction(options: { title: string; message: string; destructive?: boolean }) {
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

function openEditor(filePath: string, tool: ToolKind) {
  const tools = detectTools();
  const toolAvailability = tools[tool];
  if (toolAvailability?.executablePath) {
    spawn(toolAvailability.executablePath, [filePath], {
      detached: true,
      stdio: "ignore"
    }).unref();
    return;
  }
  if (toolAvailability?.appPath) {
    spawn("/usr/bin/open", ["-a", toolAvailability.appPath, filePath], {
      detached: true,
      stdio: "ignore"
    }).unref();
  }
}

function preferredTerminalTool(settings: AppSettings): ToolKind {
  const detected = detectTools();
  const preferred = settings.defaultTerminal;
  if (detected[preferred]?.isInstalled) {
    return preferred;
  }
  if (detected.ghostty?.isInstalled) {
    return "ghostty";
  }
  if (detected.iTerm?.isInstalled) {
    return "iTerm";
  }
  return "terminal";
}

function openInTerminal(directory: string, settings: AppSettings) {
  const tools = detectTools();
  const preferredTool = preferredTerminalTool(settings);
  const toolAvailability = tools[preferredTool];
  if (toolAvailability?.appPath) {
    spawn("/usr/bin/open", ["-a", toolAvailability.appPath, directory], {
      detached: true,
      stdio: "ignore"
    }).unref();
    return;
  }
  spawn("/usr/bin/open", ["-a", "Terminal", directory], {
    detached: true,
    stdio: "ignore"
  }).unref();
}

async function createFileFromTemplate(controller: WindowController, context: FinderActionContext, template: TemplateDefinition) {
  const directory = contextDirectoryPath(context) ?? contextPrimaryPath(context);
  if (!directory) {
    return;
  }
  const defaultName = ensureFileNameWithExtension(template.fileNameSuggestion, template.fileExtension);
  const requestedName = await promptForValue(controller, {
    title: template.title,
    message: "输入文件名",
    defaultValue: defaultName
  });
  if (!requestedName) {
    return;
  }
  const sanitized = sanitizeFileName(requestedName);
  if (!sanitized) {
    await dialog.showMessageBox({ type: "error", title: "U-Right", message: "文件名不能为空。" });
    return;
  }
  const target = path.join(directory, ensureFileNameWithExtension(sanitized, template.fileExtension));
  if (fs.existsSync(target)) {
    const shouldOverwrite = await confirmAction({
      title: "文件已存在",
      message: `${path.basename(target)} 已存在，是否覆盖？`
    });
    if (!shouldOverwrite) {
      return;
    }
  }
  fs.writeFileSync(target, template.starterContent, "utf8");
  if (template.makeExecutable) {
    fs.chmodSync(target, 0o755);
  }
  shell.showItemInFolder(target);
}

function openResultWindow(controller: WindowController, payload: ResultWindowPayload) {
  return controller.openResult(payload);
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
  const resultWindow = openResultWindow(controller, {
    title: options.title,
    markdown: "",
    canApplyToFile: false,
    suggestedFilePath: options.suggestedFilePath ?? null,
    workingDirectory: options.cwd ?? null
  });
  const child = spawn(options.command, options.args, {
    cwd: options.cwd ?? app.getPath("home")
  });
  child.stdout.on("data", (chunk) => controller.appendResult(resultWindow, String(chunk)));
  child.stderr.on("data", (chunk) => controller.appendResult(resultWindow, `\n[stderr]\n${String(chunk)}`));
  child.on("error", (error) => controller.appendResult(resultWindow, `\n[error]\n${error.message}`));
  return resultWindow;
}

async function runAIAction(request: ActionRequest, controller: WindowController) {
  const settings = loadSettings();
  if (!settings.aiEnabled) {
    await dialog.showMessageBox({ type: "error", title: "U-Right", message: "AI 功能已在设置中禁用。" });
    return;
  }
  const prompt = buildPrompt(request.actionID, request.context, settings);
  const editedPrompt = await promptForValue(controller, {
    title: prompt.title,
    message: "发送前可编辑提示词",
    defaultValue: prompt.body,
    mode: "multiline",
    submitLabel: "Send"
  });
  if (!editedPrompt) {
    return;
  }
  const updatedSettings = {
    ...settings,
    lastAIActionID: request.actionID,
    recentActionIDs: [request.actionID, ...settings.recentActionIDs.filter((id) => id !== request.actionID)].slice(0, 12)
  };
  saveSettings(updatedSettings);

  const payload: ResultWindowPayload = {
    title: prompt.title,
    markdown: "",
    canApplyToFile: request.context.selectionKind === "file" && Boolean(request.context.primaryURL),
    suggestedFilePath: contextPrimaryPath(request.context),
    workingDirectory: contextDirectoryPath(request.context) ?? contextPrimaryPath(request.context)
  };
  const resultWindow = controller.openResult(payload);

  const tools = detectTools();
  const preferredBinary = request.actionID === "ai.ask-codex" ? tools.codex?.executablePath : tools.claude?.executablePath;
  if (preferredBinary) {
    const args = request.actionID === "ai.ask-codex" ? ["exec", editedPrompt] : ["--print", editedPrompt];
    const child = spawn(preferredBinary, args, {
      cwd: payload.workingDirectory ?? app.getPath("home")
    });
    child.stdout.on("data", (chunk) => controller.appendResult(resultWindow, String(chunk)));
    child.stderr.on("data", (chunk) => controller.appendResult(resultWindow, `\n[stderr]\n${String(chunk)}`));
    child.on("error", (error) => controller.appendResult(resultWindow, `\n[error]\n${error.message}`));
    return;
  }

  if (!updatedSettings.apiKey) {
    controller.appendResult(resultWindow, "CLI 不可用，且未配置 API Key。请前往 Settings 配置 OpenAI-compatible API。");
    return;
  }

  const response = await fetch(`${updatedSettings.apiBaseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${updatedSettings.apiKey}`
    },
    body: JSON.stringify({
      model: updatedSettings.apiModel,
      messages: [
        { role: "system", content: updatedSettings.systemPromptTemplate },
        { role: "user", content: editedPrompt }
      ]
    })
  });
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  controller.appendResult(resultWindow, json.choices?.[0]?.message?.content ?? "API 返回为空。");
}

function builtInTemplateForAction(actionID: string): TemplateDefinition | undefined {
  const templateID = actionID.replace(/^create\.template\./, "");
  return BUILT_IN_TEMPLATES.find((template) => template.id === templateID);
}

function scriptPathForAction(actionID: string): string | null {
  const scriptName = actionID.replace(/^script\.run\./, "");
  const scriptPath = path.join(getSharedPaths().scriptsDirectory, scriptName);
  return fs.existsSync(scriptPath) ? scriptPath : null;
}

export async function handleActionRequest(request: ActionRequest, controller: WindowController) {
  const context = request.context;
  const actionTitle = actionTitleFor(request.actionID);
  await appendLog(
    "INFO",
    "electron-action",
    `Begin requestID=${request.id} action=${request.actionID} actionTitle=${actionTitle} selectionKind=${context.selectionKind} selectedCount=${context.selectedURLs.length} primary=${context.primaryURL ?? "-"} currentDir=${context.currentDirectoryURL ?? "-"}`
  );
  switch (request.actionID) {
    case "copy.path":
      await appendLog("INFO", "electron-action", `Copy path requestID=${request.id} actionTitle=${actionTitle} targetCount=${actionTargetPaths(context).length}`);
      clipboard.writeText(actionTargetPaths(context).join("\n"));
      await appendLog(
        "INFO",
        "electron-action",
        `Clipboard write finished requestID=${request.id} actionTitle=${actionTitle} clipboardLength=${clipboard.readText().length} clipboardPreview=${JSON.stringify(clipboard.readText().slice(0, 200))}`
      );
      return;
    case "copy.relative-path": {
      const base = contextDirectoryPath(context);
      clipboard.writeText(actionTargetPaths(context).map((item) => relativePath(base, item)).join("\n"));
      await appendLog(
        "INFO",
        "electron-action",
        `Clipboard write finished requestID=${request.id} actionTitle=${actionTitle} clipboardLength=${clipboard.readText().length} clipboardPreview=${JSON.stringify(clipboard.readText().slice(0, 200))}`
      );
      return;
    }
    case "create.new-file": {
      await createFileFromTemplate(controller, context, BUILT_IN_TEMPLATES[0]);
      return;
    }
    case "create.new-folder": {
      const directory = contextDirectoryPath(context) ?? contextPrimaryPath(context);
      if (!directory) return;
      const folderName = await promptForValue(controller, {
        title: "New Folder",
        message: "输入文件夹名称",
        defaultValue: "New Folder"
      });
      if (!folderName) return;
      const sanitized = sanitizeFileName(folderName);
      if (!sanitized) {
        await dialog.showMessageBox({ type: "error", title: "U-Right", message: "文件夹名称不能为空。" });
        return;
      }
      const target = path.join(directory, sanitized);
      if (fs.existsSync(target)) {
        await dialog.showMessageBox({
          type: "error",
          title: "U-Right",
          message: `${sanitized} 已存在。`
        });
        return;
      }
      fs.mkdirSync(target, { recursive: false });
      shell.showItemInFolder(target);
      return;
    }
    case "open.terminal": {
      const settings = loadSettings();
      const directory = contextDirectoryPath(context) ?? contextPrimaryPath(context);
      await appendLog("INFO", "electron-action", `Open terminal requestID=${request.id} directory=${directory ?? "-"}`);
      if (directory) {
        openInTerminal(directory, settings);
      }
      return;
    }
    case "open.vscode":
    case "open.cursor":
    case "open.zed": {
      const target = contextPrimaryPath(context) ?? contextDirectoryPath(context);
      if (target) {
        const explicitTool: ToolKind =
          request.actionID === "open.cursor" ? "cursor" :
          request.actionID === "open.zed" ? "zed" :
          "vscode";
        openEditor(target, explicitTool);
      }
      return;
    }
    case "finder.reveal": {
      const targets = actionTargetPaths(context);
      if (targets.length > 0) {
        shell.showItemInFolder(targets[0]);
      }
      return;
    }
    case "file.rename": {
      const target = contextPrimaryPath(context);
      if (!target) return;
      const nextName = await promptForValue(controller, {
        title: "Rename",
        message: "输入新名称",
        defaultValue: path.basename(target)
      });
      if (!nextName) return;
      const sanitized = sanitizeFileName(nextName);
      if (!sanitized) {
        await dialog.showMessageBox({ type: "error", title: "U-Right", message: "新名称不能为空。" });
        return;
      }
      const destination = path.join(path.dirname(target), sanitized);
      fs.renameSync(target, destination);
      shell.showItemInFolder(destination);
      return;
    }
    case "file.trash": {
      const targets = actionTargetPaths(context);
      if (targets.length === 0) return;
      const confirmed = await confirmAction({
        title: "Move to Trash",
        message: `这会把 ${targets.length} 个目标移到废纸篓，是否继续？`,
        destructive: true
      });
      if (!confirmed) return;
      for (const target of targets) {
        await shell.trashItem(target);
      }
      return;
    }
    case "file.duplicate": {
      const targets = actionTargetPaths(context);
      for (const target of targets) {
        const copyTarget = nextDuplicatePath(target);
        const stat = fs.statSync(target);
        if (stat.isDirectory()) {
          fs.cpSync(target, copyTarget, { recursive: true });
        } else {
          fs.copyFileSync(target, copyTarget);
        }
      }
      return;
    }
    case "file.compress": {
      const targets = actionTargetPaths(context);
      if (targets.length === 0) return;
      const first = targets[0];
      const defaultArchiveName = `${path.parse(first).name}.zip`;
      const archiveName = await promptForValue(controller, {
        title: "Compress",
        message: "Archive name",
        defaultValue: defaultArchiveName
      });
      if (!archiveName) return;
      const cwd = path.dirname(first);
      execFileSync("/usr/bin/zip", ["-r", archiveName, ...targets.map((target) => path.basename(target))], {
        cwd,
        stdio: "ignore"
      });
      shell.showItemInFolder(path.join(cwd, archiveName));
      return;
    }
    case "file.json-format": {
      const target = contextPrimaryPath(context);
      if (!target) return;
      const confirmed = await confirmAction({
        title: "JSON Format",
        message: "这会覆盖当前文件内容，是否继续？"
      });
      if (!confirmed) return;
      const content = fs.readFileSync(target, "utf8");
      const formatted = `${JSON.stringify(JSON.parse(content), null, 2)}\n`;
      fs.writeFileSync(target, formatted, "utf8");
      return;
    }
    case "file.toggle-executable": {
      const target = contextPrimaryPath(context);
      if (!target) return;
      const confirmed = await confirmAction({
        title: "Toggle Executable Bit",
        message: "这会修改文件权限，是否继续？"
      });
      if (!confirmed) return;
      const current = fs.statSync(target).mode & 0o777;
      const next = (current & 0o111) === 0 ? (current | 0o755) : (current & ~0o111);
      fs.chmodSync(target, next);
      return;
    }
    case "git.status": {
      const cwd = contextDirectoryPath(context) ?? contextPrimaryPath(context);
      if (!cwd) return;
      streamCommandToResult(controller, {
        title: "Git Status",
        command: "/usr/bin/env",
        args: ["git", "status", "--short", "--branch"],
        cwd
      });
      return;
    }
    case "ai.ask-claude":
    case "ai.ask-codex":
      await runAIAction(request, controller);
      return;
    default: {
      if (request.actionID.startsWith("create.template.")) {
        const template = builtInTemplateForAction(request.actionID);
        if (!template) {
          await dialog.showMessageBox({ type: "error", title: "U-Right", message: `未找到模板：${request.actionID}` });
          return;
        }
        await createFileFromTemplate(controller, context, template);
        return;
      }
      if (request.actionID.startsWith("script.run.")) {
        const scriptPath = scriptPathForAction(request.actionID);
        if (!scriptPath) {
          await dialog.showMessageBox({ type: "error", title: "U-Right", message: `脚本不存在：${request.actionID}` });
          return;
        }
        const cwd = contextDirectoryPath(context) ?? path.dirname(scriptPath);
        const executable = isExecutableFile(scriptPath);
        const args = executable ? actionTargetPaths(context) : [scriptPath, ...actionTargetPaths(context)];
        const command = executable ? scriptPath : "/bin/zsh";
        streamCommandToResult(controller, {
          title: `Script: ${path.basename(scriptPath)}`,
          command,
          args,
          cwd
        });
        return;
      }
      await dialog.showMessageBox({
        type: "info",
        title: "U-Right",
        message: `动作 ${request.actionID} 已由 Electron Host 接管框架，但具体实现仍待迁移。`
      });
    }
  }
}
