import { app, BrowserWindow, clipboard, dialog, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { ActionRequest, AppSettings, FinderActionContext, ResultWindowPayload, ToolKind } from "../shared/contracts";
import { loadSettings, saveSettings } from "./store";
import { detectTools } from "./tool-detection";
import type { WindowController } from "./index";

function summarizeContext(context: FinderActionContext, settings: AppSettings): string {
  if (context.selectionKind === "file" && context.primaryURL) {
    return `File: ${context.primaryURL}`;
  }
  if ((context.selectionKind === "folder" || context.selectionKind === "empty") && (context.primaryURL || context.currentDirectoryURL)) {
    return `Directory: ${context.primaryURL ?? context.currentDirectoryURL}`;
  }
  return context.selectedURLs.join("\n");
}

function buildPrompt(actionID: string, context: FinderActionContext, settings: AppSettings): { title: string; body: string } {
  const title = actionID === "ai.ask-codex" ? "Ask Codex About This" : "Ask Claude About This";
  const task = actionID === "ai.ask-codex"
    ? "Answer questions about the selected Finder context."
    : "Help the user understand or improve the selected Finder context.";
  return {
    title,
    body: `${settings.systemPromptTemplate}\n\nTask:\n${task}\n\nContext:\n${summarizeContext(context, settings)}`
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
    shell.openPath(filePath);
  }
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
    suggestedFilePath: request.context.primaryURL ?? null,
    workingDirectory: request.context.currentDirectoryURL ?? request.context.primaryURL ?? null
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

export async function handleActionRequest(request: ActionRequest, controller: WindowController) {
  const context = request.context;
  switch (request.actionID) {
    case "copy.path":
      clipboard.writeText(context.selectedURLs.join("\n"));
      return;
    case "create.new-file": {
      const directory = context.currentDirectoryURL ?? context.primaryURL;
      if (!directory) return;
      const fileName = await promptForValue(controller, {
        title: "New File",
        message: "输入文件名",
        defaultValue: "untitled"
      });
      if (!fileName) return;
      const target = path.join(directory, fileName);
      if (fs.existsSync(target)) {
        const result = await dialog.showMessageBox({
          type: "warning",
          title: "文件已存在",
          message: `${fileName} 已存在，是否覆盖？`,
          buttons: ["Overwrite", "Cancel"],
          defaultId: 1,
          cancelId: 1
        });
        if (result.response !== 0) return;
      }
      fs.writeFileSync(target, "");
      shell.showItemInFolder(target);
      return;
    }
    case "create.new-folder": {
      const directory = context.currentDirectoryURL ?? context.primaryURL;
      if (!directory) return;
      const folderName = await promptForValue(controller, {
        title: "New Folder",
        message: "输入文件夹名称",
        defaultValue: "New Folder"
      });
      if (!folderName) return;
      const target = path.join(directory, folderName);
      if (fs.existsSync(target)) {
        await dialog.showMessageBox({
          type: "error",
          title: "U-Right",
          message: `${folderName} 已存在。`
        });
        return;
      }
      fs.mkdirSync(target, { recursive: false });
      shell.showItemInFolder(target);
      return;
    }
    case "open.vscode":
    case "open.cursor":
    case "open.zed": {
      const settings = loadSettings();
      const target = context.primaryURL ?? context.currentDirectoryURL;
      if (target) {
        const explicitTool: ToolKind =
          request.actionID === "open.cursor" ? "cursor" :
          request.actionID === "open.zed" ? "zed" :
          "vscode";
        openEditor(target, explicitTool ?? settings.defaultEditor);
      }
      return;
    }
    case "ai.ask-claude":
    case "ai.ask-codex":
      await runAIAction(request, controller);
      return;
    default:
      await dialog.showMessageBox({
        type: "info",
        title: "U-Right",
        message: `动作 ${request.actionID} 已由 Electron Host 接管框架，但具体实现仍待迁移。`
      });
  }
}
