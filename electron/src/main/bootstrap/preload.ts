import { contextBridge, ipcRenderer } from "electron";
import type { AppDiagnostics, AppSettings, FinderMenuSnapshot, PromptWindowPayload, ResultWindowPayload, SettingsHistorySnapshot, ToolAvailability, WindowContextPayload } from "../../contracts/contracts";
import type { LogEntry } from "../types";
import type { SaveSettingsTransactionResult } from "../application/settings/save-settings-transaction-usecase";

console.log("[uright preload] starting");

contextBridge.exposeInMainWorld("uright", {
  getWindowContext: () => ipcRenderer.invoke("window:get-context") as Promise<WindowContextPayload>,
  loadSettings: () => ipcRenderer.invoke("settings:load") as Promise<AppSettings>,
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke("settings:save", settings) as Promise<AppSettings>,
  saveSettingsTransaction: (settings: AppSettings) => ipcRenderer.invoke("settings:save-transaction", settings) as Promise<SaveSettingsTransactionResult>,
  loadPreviousSettings: () => ipcRenderer.invoke("settings:load-previous") as Promise<SettingsHistorySnapshot | null>,
  restorePreviousSettings: () => ipcRenderer.invoke("settings:restore-previous") as Promise<SettingsHistorySnapshot | null>,
  loadDiagnostics: () => ipcRenderer.invoke("settings:diagnostics") as Promise<AppDiagnostics>,
  loadFinderSnapshot: () => ipcRenderer.invoke("finder:snapshot") as Promise<FinderMenuSnapshot | null>,
  detectTools: () => ipcRenderer.invoke("tools:detect") as Promise<Record<string, ToolAvailability>>,
  chooseDirectory: () => ipcRenderer.invoke("dialog:choose-directory") as Promise<string | null>,
  chooseApp: () => ipcRenderer.invoke("dialog:choose-app") as Promise<string | null>,
  loadLogs: () => ipcRenderer.invoke("logs:load") as Promise<LogEntry[]>,
  clearLogs: () => ipcRenderer.invoke("logs:clear") as Promise<LogEntry[]>,
  copyText: (value: string) => ipcRenderer.invoke("clipboard:write-text", value) as Promise<void>,
  submitPrompt: (value: string | null) => ipcRenderer.invoke("prompt:submit", value) as Promise<void>,
  saveResult: (markdown: string, fileName?: string) => ipcRenderer.invoke("result:save", markdown, fileName) as Promise<void>,
  applyResult: (markdown: string, filePath?: string | null) => ipcRenderer.invoke("result:apply", markdown, filePath) as Promise<void>,
  openInEditor: (filePath?: string | null) => ipcRenderer.invoke("result:open-in-editor", filePath) as Promise<void>,
  continueAIInExternal: (
    tool: "claude" | "codex",
    prompt: string,
    workingDirectory?: string | null
  ) => ipcRenderer.invoke("result:continue-ai-in-external", tool, prompt, workingDirectory) as Promise<void>,
  onResultAppend: (callback: (chunk: string) => void) => ipcRenderer.on("result:append", (_event, chunk) => callback(chunk)),
  onPromptPayload: (callback: (payload: PromptWindowPayload) => void) => ipcRenderer.on("prompt:payload", (_event, payload) => callback(payload)),
  onResultPayload: (callback: (payload: ResultWindowPayload) => void) => ipcRenderer.on("result:payload", (_event, payload) => callback(payload))
});

console.log("[uright preload] bridge exposed");
