import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppSettings, StoredSettingsDocument } from "../shared/contracts";
import { createDefaultSettings } from "../shared/defaults";

const APP_NAME = "U-Right";
const APP_GROUP = "group.com.openai.uright";
const SETTINGS_FILE = "settings.json";
const SETTINGS_BACKUP_FILE = "settings.backup.json";
const REQUESTS_DIR = "Requests";
const LOG_FILE = "uright.log";
const SETTINGS_VERSION = 1;

export interface SharedPaths {
  root: string;
  settingsFile: string;
  backupSettingsFile: string;
  requestsDirectory: string;
  logFile: string;
}

export function resolveSharedRoot(): string {
  const groupContainer = path.join(os.homedir(), "Library", "Group Containers", APP_GROUP);
  if (fs.existsSync(groupContainer)) {
    return groupContainer;
  }
  return path.join(os.homedir(), "Library", "Application Support", APP_NAME);
}

export function getSharedPaths(): SharedPaths {
  const root = resolveSharedRoot();
  fs.mkdirSync(root, { recursive: true });
  const requestsDirectory = path.join(root, REQUESTS_DIR);
  fs.mkdirSync(requestsDirectory, { recursive: true });
  return {
    root,
    settingsFile: path.join(root, SETTINGS_FILE),
    backupSettingsFile: path.join(root, SETTINGS_BACKUP_FILE),
    requestsDirectory,
    logFile: path.join(root, LOG_FILE)
  };
}

function decodeSettings(data: string): AppSettings | null {
  try {
    const parsed = JSON.parse(data) as Partial<StoredSettingsDocument & AppSettings>;
    if (parsed && typeof parsed === "object" && "settings" in parsed && parsed.settings) {
      return normalizeSettings(parsed.settings as AppSettings);
    }
    return normalizeSettings(parsed as AppSettings);
  } catch {
    return null;
  }
}

export function normalizeSettings(settings: AppSettings): AppSettings {
  const normalized = {
    ...createDefaultSettings(),
    ...settings,
    contextMenu: {
      ...createDefaultSettings().contextMenu,
      ...settings.contextMenu
    }
  };
  normalized.toolPreferences = settings.toolPreferences?.length
    ? settings.toolPreferences
    : createDefaultSettings().toolPreferences;
  normalized.contextMenu.categorySettings = settings.contextMenu?.categorySettings?.length
    ? settings.contextMenu.categorySettings
    : createDefaultSettings().contextMenu.categorySettings;
  normalized.contextMenu.actionSettings = settings.contextMenu?.actionSettings?.length
    ? settings.contextMenu.actionSettings
    : createDefaultSettings().contextMenu.actionSettings;
  normalized.aiActionVisibility = settings.aiActionVisibility?.length
    ? settings.aiActionVisibility
    : createDefaultSettings().aiActionVisibility;
  return normalized;
}

export function loadSettings(): AppSettings {
  const paths = getSharedPaths();
  if (fs.existsSync(paths.settingsFile)) {
    const current = decodeSettings(fs.readFileSync(paths.settingsFile, "utf8"));
    if (current) {
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
  const normalized = normalizeSettings(settings);
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
