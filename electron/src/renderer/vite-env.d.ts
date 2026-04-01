/// <reference types="vite/client" />

import type { AppSettings, PromptWindowPayload, ResultWindowPayload, ToolAvailability, WindowContextPayload } from "../shared/contracts";
import type { LogEntry } from "../main/types";

declare global {
  interface Window {
    uright: {
      getWindowContext: () => Promise<WindowContextPayload>;
      loadSettings: () => Promise<AppSettings>;
      saveSettings: (settings: AppSettings) => Promise<AppSettings>;
      detectTools: () => Promise<Record<string, ToolAvailability>>;
      chooseDirectory: () => Promise<string | null>;
      loadLogs: () => Promise<LogEntry[]>;
      submitPrompt: (value: string | null) => Promise<void>;
      saveResult: (markdown: string, fileName?: string) => Promise<void>;
      applyResult: (markdown: string, filePath?: string | null) => Promise<void>;
      openInEditor: (filePath?: string | null) => Promise<void>;
      onResultAppend: (callback: (chunk: string) => void) => void;
      onPromptPayload: (callback: (payload: PromptWindowPayload) => void) => void;
      onResultPayload: (callback: (payload: ResultWindowPayload) => void) => void;
    };
  }
}

export {};
