import { Menu, Tray, app, nativeImage } from "electron";
import fs from "node:fs";
import type { AppSettings } from "../../../contracts/contracts";
import { appendLog } from "../../infrastructure/logging/logs";
import { resolveIcnsIconPath } from "../../infrastructure/runtime/runtime-paths";
import type { WindowController } from "../windows/window-controller";

async function loadTrayIcon() {
  const candidatePaths = Array.from(new Set([
    resolveIcnsIconPath(),
    process.execPath
  ].filter((value): value is string => Boolean(value))));

  const probe = await Promise.all(candidatePaths.map(async (candidatePath) => {
    const exists = fs.existsSync(candidatePath);
    if (!exists) {
      return {
        candidatePath,
        exists,
        isEmpty: true,
        size: { width: 0, height: 0 },
        image: nativeImage.createEmpty()
      };
    }

    try {
      const image = await app.getFileIcon(candidatePath, { size: "normal" });
      return {
        candidatePath,
        exists,
        isEmpty: image.isEmpty(),
        size: image.getSize(),
        image
      };
    } catch (error) {
      void appendLog("ERROR", "electron-host", `Tray icon load failed path=${candidatePath} error=${error instanceof Error ? error.message : String(error)}`);
      return {
        candidatePath,
        exists,
        isEmpty: true,
        size: { width: 0, height: 0 },
        image: nativeImage.createEmpty()
      };
    }
  }));

  const winner = probe.find((item) => item.exists && !item.isEmpty);
  void appendLog(
    "INFO",
    "electron-host",
    `Tray icon probe ${JSON.stringify(probe.map(({ candidatePath, exists, isEmpty, size }) => ({ candidatePath, exists, isEmpty, size })))}`
  );

  if (!winner) {
    return nativeImage.createEmpty();
  }

  return winner.image.resize({ width: 18, height: 18 });
}

export function createTrayService(controller: WindowController) {
  let tray: Tray | null = null;
  let traySyncVersion = 0;

  function destroy() {
    tray?.destroy();
    tray = null;
  }

  async function sync(settings: AppSettings) {
    const syncVersion = ++traySyncVersion;
    if (!settings.general.showMenuBarIcon) {
      destroy();
      return;
    }

    destroy();
    const trayImage = await loadTrayIcon();
    if (syncVersion !== traySyncVersion) {
      return;
    }
    tray = new Tray(trayImage);
    tray.setToolTip("U-Right");
    tray.setTitle(trayImage.isEmpty() ? "U·R" : "");
    tray.setIgnoreDoubleClickEvents(true);
    tray.on("click", () => {
      controller.openSettings();
    });
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

  return { sync, destroy };
}
