import { app, BrowserWindow, Menu, Tray, ipcMain, dialog, nativeImage, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { AppSettings, PromptWindowPayload, ResultWindowPayload, WindowContextPayload } from "../shared/contracts";
import { getUrightBrandDataURL } from "../shared/brand";
import { loadAppDiagnostics, loadFinderMenuSnapshot, loadPreviousSettingsSnapshot, loadSettings, restorePreviousSettings, saveSettings, getSharedPaths } from "./store";
import { detectTools } from "./tool-detection";
import { clearLogs, loadLogs } from "./logs";
import { startRequestWatcher } from "./request-watcher";
import { appendLog } from "./logs";

type WindowKind = WindowContextPayload["kind"];

const windowState = new Map<number, WindowContextPayload>();
const pendingPromptResolvers = new Map<number, (value: string | null) => void>();
let tray: Tray | null = null;

function writeDevHostState() {
  if (process.env.URIGHT_DEV_HOST !== "1") {
    return;
  }
  const { root } = getSharedPaths();
  const markerPath = path.join(root, "dev-host-state.json");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    markerPath,
    JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
      mode: "electron-dev"
    }),
    "utf8"
  );
  appendLog("INFO", "electron-host", `Registered dev host marker path=${markerPath} pid=${process.pid}`);
}

function clearDevHostState() {
  const { root } = getSharedPaths();
  const markerPath = path.join(root, "dev-host-state.json");
  fs.rmSync(markerPath, { force: true });
  appendLog("INFO", "electron-host", `Cleared dev host marker path=${markerPath} pid=${process.pid}`);
}

function appIconPath(fileName: string) {
  return path.join(process.cwd(), "Resources", "App", "Assets.xcassets", "AppIcon.appiconset", fileName);
}

function loadAppIcon(fileName: string, size?: { width: number; height: number }) {
  const filePath = appIconPath(fileName);
  if (!fs.existsSync(filePath)) {
    return nativeImage.createEmpty();
  }
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) {
    return image;
  }
  return size ? image.resize(size) : image;
}

function loadBrandIcon(fileName: string, size?: { width: number; height: number }) {
  const image = loadAppIcon(fileName, size);
  if (!image.isEmpty()) {
    return image;
  }
  const fallback = nativeImage.createFromDataURL(getUrightBrandDataURL());
  if (fallback.isEmpty()) {
    return fallback;
  }
  return size ? fallback.resize(size) : fallback;
}

function rendererURL() {
  const devServerURL = process.env.VITE_DEV_SERVER_URL;
  if (devServerURL) {
    return devServerURL;
  }
  return `file://${path.join(__dirname, "../../renderer/index.html")}`;
}

function createWindow(
  kind: WindowKind,
  size: { width: number; height: number },
  payload: WindowContextPayload,
  minSize?: { width: number; height: number }
): BrowserWindow {
  const preloadPath = path.join(__dirname, "preload.js");
  if (!fs.existsSync(preloadPath)) {
    throw new Error(`Electron preload bundle is missing: ${preloadPath}`);
  }

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
  if (url.startsWith("file://")) {
    void window.loadURL(`${url}?window=${kind}`);
  } else {
    void window.loadURL(`${url}?window=${kind}`);
  }
  return window;
}

function createTray(controller: WindowController) {
  const trayImage = loadBrandIcon("icon_32x32@2x.png", { width: 18, height: 18 });
  tray = new Tray(trayImage);
  tray.setTitle("");
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
    }
  };
}

async function bootstrap() {
  writeDevHostState();

  if (process.platform === "darwin" && app.dock) {
    const dockIcon = loadBrandIcon("icon_512x512@2x.png");
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon);
    } else {
      const fallbackIcon = loadAppIcon("icon_512x512@2x.png");
      if (!fallbackIcon.isEmpty()) {
        app.dock.setIcon(fallbackIcon);
      }
    }
  }

  const controller = createController();
  createTray(controller);
  controller.openSettings();
  startRequestWatcher(controller);

  ipcMain.handle("window:get-context", (event) => {
    return windowState.get(event.sender.id);
  });

  ipcMain.handle("settings:load", () => loadSettings());
  ipcMain.handle("settings:save", (_event, settings: AppSettings) => saveSettings(settings));
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
app.on("before-quit", clearDevHostState);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
