import { app, BrowserWindow, Menu, Tray, ipcMain, dialog, nativeImage, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { AppSettings, PromptWindowPayload, ResultWindowPayload, WindowContextPayload } from "../shared/contracts";
import { loadSettings, saveSettings, getSharedPaths } from "./store";
import { detectTools } from "./tool-detection";
import { loadLogs } from "./logs";
import { startRequestWatcher } from "./request-watcher";

type WindowKind = WindowContextPayload["kind"];

const windowState = new Map<number, WindowContextPayload>();
const pendingPromptResolvers = new Map<number, (value: string | null) => void>();
let tray: Tray | null = null;

function rendererURL() {
  const devServerURL = process.env.VITE_DEV_SERVER_URL;
  if (devServerURL) {
    return devServerURL;
  }
  return `file://${path.join(__dirname, "../../renderer/index.html")}`;
}

function createWindow(kind: WindowKind, size: { width: number; height: number }, payload: WindowContextPayload): BrowserWindow {
  const preloadPath = path.join(__dirname, "preload.js");
  if (!fs.existsSync(preloadPath)) {
    throw new Error(`Electron preload bundle is missing: ${preloadPath}`);
  }

  const window = new BrowserWindow({
    width: size.width,
    height: size.height,
    backgroundColor: "#0a0d10",
    titleBarStyle: "hiddenInset",
    show: false,
    vibrancy: "under-window",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });
  windowState.set(window.webContents.id, payload);
  window.webContents.on("did-finish-load", () => {
    console.log(`[uright main] window=${kind} finished load url=${window.webContents.getURL()}`);
  });
  window.webContents.on("did-fail-load", (_event, code, description, validatedURL) => {
    console.error(`[uright main] window=${kind} failed load code=${code} description=${description} url=${validatedURL}`);
  });
  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[uright renderer:${kind}] level=${level} ${sourceId}:${line} ${message}`);
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[uright main] window=${kind} render process gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  window.once("ready-to-show", () => window.show());
  const url = rendererURL();
  if (url.startsWith("file://")) {
    void window.loadURL(`${url}?window=${kind}`);
  } else {
    void window.loadURL(`${url}?window=${kind}`);
  }
  return window;
}

function createTray(controller: WindowController) {
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle("U-Right");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Settings", click: () => controller.openSettings() },
      { label: "Logs", click: () => controller.openLogs() },
      { label: "Onboarding", click: () => controller.openOnboarding() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() }
    ])
  );
}

export interface WindowController {
  openSettings: () => BrowserWindow;
  openLogs: () => BrowserWindow;
  openOnboarding: () => BrowserWindow;
  openPrompt: (payload: PromptWindowPayload) => Promise<string | null>;
  openResult: (payload: ResultWindowPayload) => BrowserWindow;
  appendResult: (window: BrowserWindow, chunk: string) => void;
}

function createController(): WindowController {
  let settingsWindow: BrowserWindow | null = null;
  let logsWindow: BrowserWindow | null = null;
  let onboardingWindow: BrowserWindow | null = null;

  return {
    openSettings() {
      if (!settingsWindow || settingsWindow.isDestroyed()) {
        settingsWindow = createWindow("settings", { width: 1320, height: 860 }, { kind: "settings" });
      }
      settingsWindow.show();
      settingsWindow.focus();
      return settingsWindow;
    },
    openLogs() {
      if (!logsWindow || logsWindow.isDestroyed()) {
        logsWindow = createWindow("logs", { width: 980, height: 700 }, { kind: "logs" });
      }
      logsWindow.show();
      logsWindow.focus();
      return logsWindow;
    },
    openOnboarding() {
      if (!onboardingWindow || onboardingWindow.isDestroyed()) {
        onboardingWindow = createWindow("onboarding", { width: 760, height: 640 }, { kind: "onboarding" });
      }
      onboardingWindow.show();
      onboardingWindow.focus();
      return onboardingWindow;
    },
    openPrompt(payload) {
      return new Promise((resolve) => {
        const promptWindow = createWindow("prompt", { width: 860, height: payload.mode === "multiline" ? 700 : 380 }, { kind: "prompt", prompt: payload });
        pendingPromptResolvers.set(promptWindow.webContents.id, resolve);
        promptWindow.on("closed", () => {
          const pending = pendingPromptResolvers.get(promptWindow.webContents.id);
          if (pending) {
            pending(null);
            pendingPromptResolvers.delete(promptWindow.webContents.id);
          }
        });
      });
    },
    openResult(payload) {
      return createWindow("result", { width: 1040, height: 780 }, { kind: "result", result: payload });
    },
    appendResult(window, chunk) {
      if (!window.isDestroyed()) {
        window.webContents.send("result:append", chunk);
      }
    }
  };
}

async function bootstrap() {
  const controller = createController();
  createTray(controller);
  controller.openSettings();
  startRequestWatcher(controller);

  ipcMain.handle("window:get-context", (event) => {
    return windowState.get(event.sender.id);
  });

  ipcMain.handle("settings:load", () => loadSettings());
  ipcMain.handle("settings:save", (_event, settings: AppSettings) => saveSettings(settings));
  ipcMain.handle("tools:detect", () => detectTools());
  ipcMain.handle("dialog:choose-directory", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("logs:load", () => loadLogs());
  ipcMain.handle("prompt:submit", (event, value: string | null) => {
    const resolver = pendingPromptResolvers.get(event.sender.id);
    if (resolver) {
      resolver(value);
      pendingPromptResolvers.delete(event.sender.id);
    }
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
}

app.whenReady().then(bootstrap);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
