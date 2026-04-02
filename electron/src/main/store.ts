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
  templatesDirectory: string;
  scriptsDirectory: string;
  logFile: string;
}

export function resolveSharedRoot(): string {
  const appGroupIdentifier = process.env.APP_GROUP_IDENTIFIER?.trim() || APP_GROUP;
  const groupContainer = path.join(os.homedir(), "Library", "Group Containers", appGroupIdentifier);
  if (fs.existsSync(groupContainer)) {
    return groupContainer;
  }
  return path.join(os.homedir(), "Library", "Application Support", APP_NAME);
}

export function resolveAppGroupIdentifier(): string {
  return process.env.APP_GROUP_IDENTIFIER?.trim() || APP_GROUP;
}

export function getSharedPaths(): SharedPaths {
  const root = resolveSharedRoot();
  fs.mkdirSync(root, { recursive: true });
  const requestsDirectory = path.join(root, REQUESTS_DIR);
  const templatesDirectory = path.join(root, "Templates");
  const scriptsDirectory = path.join(root, "Scripts");
  fs.mkdirSync(requestsDirectory, { recursive: true });
  fs.mkdirSync(templatesDirectory, { recursive: true });
  fs.mkdirSync(scriptsDirectory, { recursive: true });
  return {
    root,
    settingsFile: path.join(root, SETTINGS_FILE),
    backupSettingsFile: path.join(root, SETTINGS_BACKUP_FILE),
    requestsDirectory,
    templatesDirectory,
    scriptsDirectory,
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
  const defaults = createDefaultSettings();
  const normalized = {
    ...defaults,
    ...settings,
    contextMenu: {
      ...defaults.contextMenu,
      ...settings.contextMenu
    }
  };
  normalized.toolPreferences = settings.toolPreferences?.length
    ? settings.toolPreferences
    : defaults.toolPreferences;
  const existingCategorySettings = new Map((settings.contextMenu?.categorySettings ?? []).map((item) => [item.category, item]));
  normalized.contextMenu.categorySettings = defaults.contextMenu.categorySettings.map((item) => existingCategorySettings.get(item.category) ?? item);
  const existingActionSettings = new Map((settings.contextMenu?.actionSettings ?? []).map((item) => [item.actionID, item]));
  normalized.contextMenu.actionSettings = defaults.contextMenu.actionSettings.map((item) => existingActionSettings.get(item.actionID) ?? item);
  normalized.aiActionVisibility = settings.aiActionVisibility?.length
    ? settings.aiActionVisibility
    : defaults.aiActionVisibility;
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
