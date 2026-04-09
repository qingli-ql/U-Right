import { BrowserWindow } from "electron";
import type { PromptWindowPayload, ResultWindowPayload, WindowContextPayload } from "../../../contracts/contracts";
import { getSharedPaths } from "../../infrastructure/runtime/shared-paths";
import { resolveDevRendererURL } from "../../adapters/finder/dev-manifest";
import { resolvePreloadPath, resolveRendererURL } from "../../infrastructure/runtime/runtime-paths";

type WindowKind = WindowContextPayload["kind"];

const windowState = new Map<number, WindowContextPayload>();
const pendingPromptResolvers = new Map<number, (value: string | null) => void>();

function rendererURL() {
  const sharedRoot = getSharedPaths().root;
  return resolveRendererURL(resolveDevRendererURL(sharedRoot));
}

function createWindow(
  kind: WindowKind,
  size: { width: number; height: number },
  payload: WindowContextPayload,
  minSize?: { width: number; height: number }
): BrowserWindow {
  const preloadPath = resolvePreloadPath();

  const window = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: minSize?.width ?? size.width,
    minHeight: minSize?.height ?? size.height,
    title: "",
    backgroundColor: "#f6efe2",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 18, y: 18 },
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });
  const webContents = window.webContents;
  windowState.set(webContents.id, payload);
  webContents.on("did-finish-load", () => {
    if (webContents.isDestroyed()) {
      return;
    }
    console.log(`[uright main] window=${kind} finished load url=${webContents.getURL()}`);
  });
  webContents.on("did-fail-load", (_event, code, description, validatedURL) => {
    console.error(`[uright main] window=${kind} failed load code=${code} description=${description} url=${validatedURL}`);
  });
  webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[uright renderer:${kind}] level=${level} ${sourceId}:${line} ${message}`);
  });
  webContents.on("render-process-gone", (_event, details) => {
    console.error(`[uright main] window=${kind} render process gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  window.once("ready-to-show", () => {
    if (!window.isDestroyed()) {
      window.show();
    }
  });
  window.on("closed", () => {
    windowState.delete(webContents.id);
    pendingPromptResolvers.delete(webContents.id);
  });
  const url = rendererURL();
  void window.loadURL(`${url}?window=${kind}`);
  return window;
}

export interface WindowController {
  openSettings: () => BrowserWindow;
  openLogs: () => BrowserWindow;
  openOnboarding: () => BrowserWindow;
  openPrompt: (payload: PromptWindowPayload) => Promise<string | null>;
  openResult: (payload: ResultWindowPayload) => BrowserWindow;
  appendResult: (window: BrowserWindow, chunk: string) => void;
  updateResult: (window: BrowserWindow, payload: Partial<ResultWindowPayload>) => void;
  getWindowContext: (senderID: number) => WindowContextPayload | undefined;
  submitPrompt: (senderID: number, value: string | null) => void;
}

export function createWindowController(): WindowController {
  let settingsWindow: BrowserWindow | null = null;
  let logsWindow: BrowserWindow | null = null;
  let onboardingWindow: BrowserWindow | null = null;

  return {
    openSettings() {
      if (!settingsWindow || settingsWindow.isDestroyed()) {
        settingsWindow = createWindow("settings", { width: 1320, height: 860 }, { kind: "settings" }, { width: 960, height: 620 });
      }
      if (!settingsWindow.isDestroyed()) {
        settingsWindow.show();
        settingsWindow.focus();
      }
      return settingsWindow;
    },
    openLogs() {
      if (!logsWindow || logsWindow.isDestroyed()) {
        logsWindow = createWindow("logs", { width: 980, height: 700 }, { kind: "logs" }, { width: 820, height: 520 });
      }
      if (!logsWindow.isDestroyed()) {
        logsWindow.show();
        logsWindow.focus();
      }
      return logsWindow;
    },
    openOnboarding() {
      if (!onboardingWindow || onboardingWindow.isDestroyed()) {
        onboardingWindow = createWindow("onboarding", { width: 760, height: 640 }, { kind: "onboarding" }, { width: 680, height: 520 });
      }
      if (!onboardingWindow.isDestroyed()) {
        onboardingWindow.show();
        onboardingWindow.focus();
      }
      return onboardingWindow;
    },
    openPrompt(payload) {
      return new Promise((resolve) => {
        const promptSize =
          payload.mode === "multiline"
            ? { width: 860, height: 700 }
            : payload.variant === "compact"
              ? { width: 460, height: 228 }
              : { width: 860, height: 380 };
        const promptWindow = createWindow(
          "prompt",
          promptSize,
          { kind: "prompt", prompt: payload },
          payload.mode === "multiline"
            ? { width: 720, height: 520 }
            : payload.variant === "compact"
              ? { width: 420, height: 208 }
              : { width: 720, height: 300 }
        );
        promptWindow.setResizable(payload.mode === "multiline");
        promptWindow.setMinimizable(false);
        promptWindow.setMaximizable(false);
        const promptWebContentsID = promptWindow.webContents.id;
        pendingPromptResolvers.set(promptWebContentsID, resolve);
        promptWindow.on("closed", () => {
          const pending = pendingPromptResolvers.get(promptWebContentsID);
          if (pending) {
            pending(null);
            pendingPromptResolvers.delete(promptWebContentsID);
          }
        });
      });
    },
    openResult(payload) {
      return createWindow("result", { width: 1040, height: 780 }, { kind: "result", result: payload }, { width: 860, height: 560 });
    },
    appendResult(window, chunk) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("result:append", chunk);
      }
    },
    updateResult(window, payload) {
      if (window.isDestroyed() || window.webContents.isDestroyed()) {
        return;
      }
      const current = windowState.get(window.webContents.id);
      if (!current || current.kind !== "result" || !current.result) {
        return;
      }
      const nextResult = { ...current.result, ...payload };
      windowState.set(window.webContents.id, { ...current, result: nextResult });
      window.webContents.send("result:payload", nextResult);
    },
    getWindowContext(senderID) {
      return windowState.get(senderID);
    },
    submitPrompt(senderID, value) {
      const resolver = pendingPromptResolvers.get(senderID);
      if (!resolver) {
        return;
      }
      resolver(value);
      pendingPromptResolvers.delete(senderID);
    }
  };
}
