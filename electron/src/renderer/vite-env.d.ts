/// <reference types="vite/client" />

import type { AppDiagnostics, AppSettings, FinderMenuSnapshot, PromptWindowPayload, ResultWindowPayload, SettingsHistorySnapshot, ToolAvailability, WindowContextPayload } from "../contracts/contracts";
import type { LogEntry } from "../main/types";

interface SaveSettingsTransactionResult {
  settings: AppSettings;
  previousSnapshot: SettingsHistorySnapshot | null;
  diagnostics: AppDiagnostics;
}

declare global {
  interface Window {
    uright: {
      getWindowContext: () => Promise<WindowContextPayload>;
      loadSettings: () => Promise<AppSettings>;
      saveSettings: (settings: AppSettings) => Promise<AppSettings>;
      saveSettingsTransaction: (settings: AppSettings) => Promise<SaveSettingsTransactionResult>;
      loadPreviousSettings: () => Promise<SettingsHistorySnapshot | null>;
      restorePreviousSettings: () => Promise<SettingsHistorySnapshot | null>;
      loadDiagnostics: () => Promise<AppDiagnostics>;
      loadFinderSnapshot: () => Promise<FinderMenuSnapshot | null>;
      detectTools: () => Promise<Record<string, ToolAvailability>>;
      chooseDirectory: () => Promise<string | null>;
      chooseApp: () => Promise<string | null>;
      loadLogs: () => Promise<LogEntry[]>;
      clearLogs: () => Promise<LogEntry[]>;
      copyText: (value: string) => Promise<void>;
      submitPrompt: (value: string | null) => Promise<void>;
      saveResult: (markdown: string, fileName?: string) => Promise<void>;
      applyResult: (markdown: string, filePath?: string | null) => Promise<void>;
      openInEditor: (filePath?: string | null) => Promise<void>;
      continueAIInExternal: (tool: "claude" | "codex", prompt: string, workingDirectory?: string | null) => Promise<void>;
      onResultAppend: (callback: (chunk: string) => void) => void;
      onPromptPayload: (callback: (payload: PromptWindowPayload) => void) => void;
      onResultPayload: (callback: (payload: ResultWindowPayload) => void) => void;
    };
  }
}

export {};
