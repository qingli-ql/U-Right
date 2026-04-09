import fs from "node:fs";
import type {
  AppSettings,
  SettingsHistorySnapshot,
  StoredSettingsDocument,
  StoredSettingsV3
} from "../../../contracts/contracts";
import { createDefaultSettings } from "../../../contracts/defaults";
import { getSharedPaths } from "../../infrastructure/runtime/shared-paths";
import { decodeSettingsDocument, normalizeSettings, SETTINGS_VERSION } from "./settings-migration";

function readStoredDocument(filePath: string): StoredSettingsDocument | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return decodeSettingsDocument(fs.readFileSync(filePath, "utf8"));
}

function decodeSettings(data: string): AppSettings | null {
  return decodeSettingsDocument(data)?.settings ?? null;
}

export function loadStoredSettingsDocument(): StoredSettingsDocument | null {
  return readStoredDocument(getSharedPaths().settingsFile);
}

export function loadSettings(): AppSettings {
  const paths = getSharedPaths();
  if (fs.existsSync(paths.settingsFile)) {
    const raw = fs.readFileSync(paths.settingsFile, "utf8");
    const current = decodeSettings(raw);
    if (current) {
      const currentDocument = decodeSettingsDocument(raw);
      if ((currentDocument?.version ?? 0) < SETTINGS_VERSION) {
        return saveSettings(current);
      }
      return current;
    }
  }
  if (fs.existsSync(paths.backupSettingsFile)) {
    const backup = decodeSettings(fs.readFileSync(paths.backupSettingsFile, "utf8"));
    if (backup) {
      saveSettings(backup);
      return backup;
    }
  }
  const defaults = createDefaultSettings();
  saveSettings(defaults);
  return defaults;
}

export function saveSettings(settings: AppSettings): AppSettings {
  const paths = getSharedPaths();
  const normalized = normalizeSettings(settings as StoredSettingsV3);
  if (fs.existsSync(paths.settingsFile)) {
    fs.copyFileSync(paths.settingsFile, paths.backupSettingsFile);
  }
  const document: StoredSettingsDocument = {
    version: SETTINGS_VERSION,
    updatedAt: new Date().toISOString(),
    settings: normalized
  };
  fs.writeFileSync(paths.settingsFile, JSON.stringify(document, null, 2));
  return normalized;
}

export function loadPreviousSettingsSnapshot(): SettingsHistorySnapshot | null {
  const paths = getSharedPaths();
  if (!fs.existsSync(paths.backupSettingsFile)) {
    return null;
  }
  const document = decodeSettingsDocument(fs.readFileSync(paths.backupSettingsFile, "utf8"));
  if (!document) {
    return null;
  }
  return {
    updatedAt: document.updatedAt,
    settings: document.settings
  };
}

export function restorePreviousSettings(): SettingsHistorySnapshot | null {
  const previous = loadPreviousSettingsSnapshot();
  if (!previous) {
    return null;
  }
  const restored = saveSettings(previous.settings);
  return {
    updatedAt: new Date().toISOString(),
    settings: restored
  };
}
