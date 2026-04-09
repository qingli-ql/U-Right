import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import { loadSettings } from "../application/settings/settings-repository";
import { writePreferredHostRuntime } from "../application/runtime/preferred-host-runtime";
import { startRequestWatcher } from "../application/requests/request-watcher";
import { appendLog } from "../infrastructure/logging/logs";
import { getSharedPaths } from "../infrastructure/runtime/shared-paths";
import { resolveDevRendererURL } from "../adapters/finder/dev-manifest";
import { createWindowController, type WindowController } from "../desktop/windows/window-controller";
import { createTrayService } from "../desktop/tray/tray-service";
import { registerIpcHandlers } from "./ipc";

let activeController: WindowController | null = null;

function isDevHostMode() {
  if (process.env.URIGHT_DEV_HOST === "1") {
    return true;
  }
  try {
    return Boolean(resolveDevRendererURL(getSharedPaths().root));
  } catch {
    return false;
  }
}

if (process.platform === "darwin") {
  app.setActivationPolicy("accessory");
}

function writeDevHostState() {
  const devHostMode = isDevHostMode();
  writePreferredHostRuntime(devHostMode ? "electron-dev" : "electron-app");
  if (!devHostMode) {
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

async function bootstrap() {
  writeDevHostState();

  if (process.platform === "darwin" && app.dock) {
    app.dock.hide();
  }

  const controller = createWindowController();
  const trayService = createTrayService(controller);
  activeController = controller;
  await trayService.sync(loadSettings());
  startRequestWatcher(controller);
  registerIpcHandlers(controller, (settings) => {
    void trayService.sync(settings);
  });
}

const isPrimaryInstance = app.requestSingleInstanceLock();

if (!isPrimaryInstance) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (activeController) {
      activeController.openSettings();
      return;
    }
    app.focus({ steal: true });
  });

  app.whenReady().then(bootstrap);
}

app.on("before-quit", clearDevHostState);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
