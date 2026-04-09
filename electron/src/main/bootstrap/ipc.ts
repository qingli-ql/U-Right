import { BrowserWindow, clipboard, dialog, ipcMain, shell } from "electron";
import fs from "node:fs";
import type { AppSettings } from "../../contracts/contracts";
import { clearLogs, loadLogs } from "../infrastructure/logging/logs";
import { getSharedPaths } from "../infrastructure/runtime/shared-paths";
import { loadAppDiagnostics } from "../application/diagnostics/diagnostics-repository";
import { loadFinderMenuSnapshot } from "../application/finder/finder-menu-snapshot-repository";
import {
  loadPreviousSettingsSnapshot,
  loadSettings,
  restorePreviousSettings,
  saveSettings
} from "../application/settings/settings-repository";
import { saveSettingsTransactionUseCase } from "../application/settings/save-settings-transaction-usecase";
import {
  
} from "../store";
import { detectTools } from "../adapters/tools/tool-detection";
import { launchInteractiveAITool } from "../adapters/ai/external-ai";
import type { WindowController } from "../desktop/windows/window-controller";

export function registerIpcHandlers(controller: WindowController, onSettingsSaved: (settings: AppSettings) => void) {
  ipcMain.handle("window:get-context", (event) => {
    return controller.getWindowContext(event.sender.id);
  });

  ipcMain.handle("settings:load", () => loadSettings());
  ipcMain.handle("settings:save", (_event, settings: AppSettings) => {
    const saved = saveSettings(settings);
    onSettingsSaved(saved);
    return saved;
  });
  ipcMain.handle("settings:save-transaction", (_event, settings: AppSettings) => {
    const transaction = saveSettingsTransactionUseCase(settings);
    onSettingsSaved(transaction.settings);
    return transaction;
  });
  ipcMain.handle("settings:load-previous", () => loadPreviousSettingsSnapshot());
  ipcMain.handle("settings:restore-previous", () => restorePreviousSettings());
  ipcMain.handle("diagnostics:load", () => loadAppDiagnostics());
  ipcMain.handle("settings:diagnostics", () => loadAppDiagnostics());
  ipcMain.handle("finder:snapshot", () => loadFinderMenuSnapshot());
  ipcMain.handle("tools:detect", () => detectTools());
  ipcMain.handle("dialog:choose-directory", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("dialog:choose-app", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Applications", extensions: ["app"] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("logs:load", () => loadLogs());
  ipcMain.handle("logs:clear", () => {
    clearLogs();
    return loadLogs();
  });
  ipcMain.handle("clipboard:write-text", (_event, value: string) => {
    clipboard.writeText(value);
  });
  ipcMain.handle("prompt:submit", (event, value: string | null) => {
    controller.submitPrompt(event.sender.id, value);
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMain.handle("result:save", async (_event, markdown: string, fileName?: string) => {
    const result = await dialog.showSaveDialog({ defaultPath: fileName ?? "result.md" });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, markdown, "utf8");
    }
  });
  ipcMain.handle("result:apply", (_event, markdown: string, filePath?: string | null) => {
    if (filePath) {
      return dialog.showMessageBox({
        type: "warning",
        title: "Apply Changes",
        message: "这会写回文件，是否继续？",
        buttons: ["Continue", "Cancel"],
        defaultId: 1,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          fs.writeFileSync(filePath, markdown, "utf8");
        }
      });
    }
  });
  ipcMain.handle("result:open-in-editor", (_event, filePath?: string | null) => {
    if (filePath) {
      return shell.openPath(filePath);
    }
  });
  ipcMain.handle("result:continue-ai-in-external", (_event, tool: "claude" | "codex", prompt: string, workingDirectory?: string | null) => {
    try {
      launchInteractiveAITool(tool, prompt, workingDirectory);
    } catch (error) {
      return dialog.showMessageBox({
        type: "error",
        title: "Open External AI Tool",
        message: error instanceof Error ? error.message : String(error)
      }).then(() => undefined);
    }
  });
  void getSharedPaths();
}
