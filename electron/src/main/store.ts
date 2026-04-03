import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppDiagnostics, AppSettings, FinderMenuSnapshot, SettingsHistorySnapshot, StoredSettingsDocument } from "../shared/contracts";
import { createDefaultSettings } from "../shared/defaults";
import {
  createDefaultActionSettings,
  createDefaultCategorySettings,
  DEFAULT_VISIBLE_AI_ACTION_IDS,
  PROMOTED_ACTION_VISIBILITY_GROUPS,
  TOOL_ORDER
} from "../shared/action-registry";

const APP_NAME = "U-Right";
const APP_GROUP = "group.com.openai.uright.shared";
const SETTINGS_FILE = "settings.json";
const SETTINGS_BACKUP_FILE = "settings.backup.json";
const REQUESTS_DIR = "Requests";
const LOG_FILE = "uright.log";
const FINDER_MENU_SNAPSHOT_FILE = "finder-menu-snapshot.json";
const SETTINGS_VERSION = 2;
const APP_GROUP_INFO_KEY = "URightAppGroupIdentifier";
const LEGACY_APP_GROUP = "group.com.openai.uright";

export interface SharedPaths {
  root: string;
  settingsFile: string;
  backupSettingsFile: string;
  requestsDirectory: string;
  templatesDirectory: string;
  scriptsDirectory: string;
  logFile: string;
  finderMenuSnapshotFile: string;
}

function sharedPathsForRoot(root: string): SharedPaths {
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
    logFile: path.join(root, LOG_FILE),
    finderMenuSnapshotFile: path.join(root, FINDER_MENU_SNAPSHOT_FILE)
  };
}

function copyIfMissing(source: string, destination: string) {
  if (!fs.existsSync(source) || fs.existsSync(destination)) {
    return;
  }
  fs.copyFileSync(source, destination);
}

function legacyContainerRoot(): string {
  return path.join(os.homedir(), "Library", "Group Containers", LEGACY_APP_GROUP);
}

function migrateLegacyContainerIfNeeded(targetRoot: string) {
  if (path.basename(targetRoot) === LEGACY_APP_GROUP) {
    return;
  }
  const legacyRoot = legacyContainerRoot();
  if (!fs.existsSync(legacyRoot)) {
    return;
  }
  const targetPaths = sharedPathsForRoot(targetRoot);
  const legacyPaths = sharedPathsForRoot(legacyRoot);
  copyIfMissing(legacyPaths.settingsFile, targetPaths.settingsFile);
  copyIfMissing(legacyPaths.backupSettingsFile, targetPaths.backupSettingsFile);
  copyIfMissing(legacyPaths.finderMenuSnapshotFile, targetPaths.finderMenuSnapshotFile);
}

function readAppGroupFromInstalledApp(): string | null {
  const infoPlistPath = "/Applications/U-Right.app/Contents/Info.plist";
  if (!fs.existsSync(infoPlistPath)) {
    return null;
  }
  const raw = fs.readFileSync(infoPlistPath, "utf8");
  const start = raw.indexOf(`<key>${APP_GROUP_INFO_KEY}</key>`);
  if (start < 0) {
    return null;
  }
  const match = raw.slice(start).match(/<string>([^<]+)<\/string>/);
  if (!match?.[1]) {
    return null;
  }
  const value = match[1].trim();
  return value && !value.includes("$(") ? value : null;
}

export function resolveSharedRoot(): string {
  const appGroupIdentifier = resolveAppGroupIdentifier();
  const groupContainer = path.join(os.homedir(), "Library", "Group Containers", appGroupIdentifier);
  migrateLegacyContainerIfNeeded(groupContainer);
  return groupContainer;
}

export function resolveAppGroupIdentifier(): string {
  const resolved = process.env.APP_GROUP_IDENTIFIER?.trim()
    || process.env[APP_GROUP_INFO_KEY]?.trim()
    || readAppGroupFromInstalledApp();
  if (!resolved) {
    throw new Error(
      "Missing app group identifier. Set APP_GROUP_IDENTIFIER (or URightAppGroupIdentifier) before launching Electron Host."
    );
  }
  if (resolved === LEGACY_APP_GROUP) {
    throw new Error(
      `Refusing to run with legacy app group (${LEGACY_APP_GROUP}). Please use the signed team-based app group identifier.`
    );
  }
  return resolved;
}

export function getSharedPaths(): SharedPaths {
  return sharedPathsForRoot(resolveSharedRoot());
}

function readStoredDocument(filePath: string): StoredSettingsDocument | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return decodeSettingsDocument(fs.readFileSync(filePath, "utf8"));
}

function decodeSettings(data: string): AppSettings | null {
  try {
    const parsed = JSON.parse(data) as Partial<StoredSettingsDocument & AppSettings>;
    if (parsed && typeof parsed === "object" && "settings" in parsed && parsed.settings) {
      return normalizeSettings(parsed.settings as AppSettings, typeof parsed.version === "number" ? parsed.version : 0);
    }
    return normalizeSettings(parsed as AppSettings, 0);
  } catch {
    return null;
  }
}

function decodeSettingsDocument(data: string): StoredSettingsDocument | null {
  try {
    const parsed = JSON.parse(data) as Partial<StoredSettingsDocument & AppSettings>;
    if (parsed && typeof parsed === "object" && "settings" in parsed && parsed.settings) {
      return {
        version: typeof parsed.version === "number" ? parsed.version : 0,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
        settings: normalizeSettings(parsed.settings as AppSettings, typeof parsed.version === "number" ? parsed.version : 0)
      };
    }
    return {
      version: 0,
      updatedAt: new Date(0).toISOString(),
      settings: normalizeSettings(parsed as AppSettings, 0)
    };
  } catch {
    return null;
  }
}

export function normalizeSettings(settings: AppSettings, sourceVersion = SETTINGS_VERSION): AppSettings {
  const defaults = createDefaultSettings();
  const anySettings = settings as unknown as Record<string, unknown>;

  const rawGeneral = (anySettings.general ?? {}) as Record<string, unknown>;
  const rawIntegrations = (anySettings.integrations ?? {}) as Record<string, unknown>;
  const rawTemplates = (anySettings.templates ?? {}) as Record<string, unknown>;
  const rawAI = (anySettings.ai ?? {}) as Record<string, unknown>;
  const rawCustomActions = (anySettings.customActions ?? {}) as Record<string, unknown>;
  const rawAdvanced = (anySettings.advanced ?? {}) as Record<string, unknown>;
  const rawContextMenu = (anySettings.contextMenu ?? {}) as Record<string, unknown>;

  const normalized: AppSettings = {
    pinnedActionIDs: Array.isArray(anySettings.pinnedActionIDs)
      ? (anySettings.pinnedActionIDs as string[])
      : defaults.pinnedActionIDs,
    recentActionIDs: Array.isArray(anySettings.recentActionIDs)
      ? (anySettings.recentActionIDs as string[])
      : defaults.recentActionIDs,
    lastAIActionID: (anySettings.lastAIActionID as string | null | undefined) ?? defaults.lastAIActionID,
    contextMenu: {
      ...defaults.contextMenu,
      ...rawContextMenu
    },
    general: {
      launchAtLogin: (rawGeneral.launchAtLogin as boolean | undefined) ?? defaults.general.launchAtLogin,
      showMenuBarIcon: (rawGeneral.showMenuBarIcon as boolean | undefined) ?? defaults.general.showMenuBarIcon,
      showExtensionStatus: (rawGeneral.showExtensionStatus as boolean | undefined) ?? defaults.general.showExtensionStatus
    },
    integrations: {
      defaultTerminal: (rawIntegrations.defaultTerminal as AppSettings["integrations"]["defaultTerminal"] | undefined) ?? defaults.integrations.defaultTerminal,
      defaultEditor: (rawIntegrations.defaultEditor as AppSettings["integrations"]["defaultEditor"] | undefined) ?? defaults.integrations.defaultEditor,
      toolPreferences: Array.isArray(rawIntegrations.toolPreferences)
        ? (rawIntegrations.toolPreferences as AppSettings["integrations"]["toolPreferences"])
        : defaults.integrations.toolPreferences,
      customExecutablePaths: {
        ...defaults.integrations.customExecutablePaths,
        ...((rawIntegrations.customExecutablePaths as Record<string, string> | undefined) ?? {})
      }
    },
    templates: {
      customTemplateFolder: (rawTemplates.customTemplateFolder as string | undefined) ?? defaults.templates.customTemplateFolder,
      userTemplates: Array.isArray(rawTemplates.userTemplates)
        ? (rawTemplates.userTemplates as AppSettings["templates"]["userTemplates"])
        : defaults.templates.userTemplates,
      extensionDefaults: Array.isArray(rawTemplates.extensionDefaults)
        ? (rawTemplates.extensionDefaults as AppSettings["templates"]["extensionDefaults"])
        : defaults.templates.extensionDefaults
    },
    ai: {
      enabled: (rawAI.enabled as boolean | undefined) ?? defaults.ai.enabled,
      preferredProvider: (rawAI.preferredProvider as AppSettings["ai"]["preferredProvider"] | undefined) ?? defaults.ai.preferredProvider,
      profiles: Array.isArray(rawAI.profiles)
        ? (rawAI.profiles as AppSettings["ai"]["profiles"])
        : defaults.ai.profiles,
      defaultProfileID: (rawAI.defaultProfileID as string | null | undefined) ?? defaults.ai.defaultProfileID,
      promptPolicies: Array.isArray(rawAI.promptPolicies)
        ? (rawAI.promptPolicies as AppSettings["ai"]["promptPolicies"])
        : defaults.ai.promptPolicies,
      defaultPromptPolicyID: (rawAI.defaultPromptPolicyID as string | null | undefined) ?? defaults.ai.defaultPromptPolicyID,
      actionVisibility: Array.isArray(rawAI.actionVisibility)
        ? (rawAI.actionVisibility as string[])
        : DEFAULT_VISIBLE_AI_ACTION_IDS
    },
    customActions: {
      openActions: Array.isArray(rawCustomActions.openActions)
        ? (rawCustomActions.openActions as AppSettings["customActions"]["openActions"])
        : defaults.customActions.openActions
    },
    advanced: {
      debugLogging: (rawAdvanced.debugLogging as boolean | undefined) ?? defaults.advanced.debugLogging
    }
  };

  const existingCategorySettings = new Map((normalized.contextMenu.categorySettings ?? []).map((item) => [item.category, item]));
  normalized.contextMenu.categorySettings = defaults.contextMenu.categorySettings.map((item) => existingCategorySettings.get(item.category) ?? item);
  const existingActionSettings = new Map((normalized.contextMenu.actionSettings ?? []).map((item) => [item.actionID, item]));
  normalized.contextMenu.actionSettings = defaults.contextMenu.actionSettings.map((item) => existingActionSettings.get(item.actionID) ?? item);

  if (sourceVersion < 2) {
    for (const group of PROMOTED_ACTION_VISIBILITY_GROUPS) {
      const previousGroupSettings = group.map((actionID) => existingActionSettings.get(actionID));
      const shouldPromoteWholeGroup = previousGroupSettings.every((item) =>
        item
        && item.isEnabled === false
        && item.categoryOverride == null
        && item.orderOverride == null
      );
      if (!shouldPromoteWholeGroup) {
        continue;
      }
      const promotedActionIDs = new Set<string>(group);
      normalized.contextMenu.actionSettings = normalized.contextMenu.actionSettings.map((item) =>
        promotedActionIDs.has(item.actionID) ? { ...item, isEnabled: true } : item
      );
    }
  }

  normalized.contextMenu.categorySettings = normalized.contextMenu.categorySettings.length ? normalized.contextMenu.categorySettings : createDefaultCategorySettings();
  normalized.contextMenu.actionSettings = normalized.contextMenu.actionSettings.length ? normalized.contextMenu.actionSettings : createDefaultActionSettings();
  normalized.integrations.toolPreferences = normalized.integrations.toolPreferences.length
    ? TOOL_ORDER.map((kind) => normalized.integrations.toolPreferences.find((item) => item.kind === kind) ?? { kind, customPath: "", allowMenuActions: true })
    : defaults.integrations.toolPreferences;
  normalized.ai.actionVisibility = normalized.ai.actionVisibility.length
    ? normalized.ai.actionVisibility
    : DEFAULT_VISIBLE_AI_ACTION_IDS;

  return normalized;
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

export function loadAppDiagnostics(): AppDiagnostics {
  const paths = getSharedPaths();
  const document = readStoredDocument(paths.settingsFile);
  const finderMenuSnapshot = loadFinderMenuSnapshot();
  const groupContainersRoot = path.join(os.homedir(), "Library", "Group Containers");
  const currentContainer = paths.root;
  const legacyContainer = legacyContainerRoot();
  const candidateGroupContainers = [currentContainer]
    .concat(fs.existsSync(legacyContainer) && legacyContainer !== currentContainer ? [legacyContainer] : [])
    .sort();
  const hasLegacyContainerConflict = fs.existsSync(legacyContainer)
    && legacyContainer !== currentContainer
    && !finderMenuSnapshot;
  const warning = hasLegacyContainerConflict
    ? "检测到历史遗留共享容器，且当前容器缺少 Finder 快照。请重新安装并重新加载 Finder Extension。"
    : null;
  const errors: string[] = [];
  if (!finderMenuSnapshot) {
    errors.push("缺少 Finder 实际菜单快照：finder-menu-snapshot.json 不存在或无法解析。");
  }
  if ((document?.version ?? 0) < SETTINGS_VERSION) {
    errors.push(`设置文档版本过旧：当前为 v${document?.version ?? 0}，预期为 v${SETTINGS_VERSION}。`);
  }
  if (finderMenuSnapshot?.appGroupIdentifier && finderMenuSnapshot.appGroupIdentifier !== resolveAppGroupIdentifier()) {
    errors.push(`Finder 快照 app group 与 Electron 不一致：snapshot=${finderMenuSnapshot.appGroupIdentifier} electron=${resolveAppGroupIdentifier()}`);
  }
  const availableScriptNames = fs.existsSync(paths.scriptsDirectory)
    ? fs.readdirSync(paths.scriptsDirectory)
      .filter((entry) => {
        const candidate = path.join(paths.scriptsDirectory, entry);
        return path.extname(entry) !== "" || fs.statSync(candidate).mode & 0o111;
      })
      .sort()
    : [];

  return {
    appGroupIdentifier: resolveAppGroupIdentifier(),
    sharedRoot: paths.root,
    settingsFile: paths.settingsFile,
    settingsVersion: document?.version ?? 0,
    settingsUpdatedAt: document?.updatedAt ?? null,
    candidateGroupContainers,
    warning,
    errors,
    availableScriptNames,
    finderMenuSnapshot
  };
}

export function loadFinderMenuSnapshot(): FinderMenuSnapshot | null {
  const { finderMenuSnapshotFile } = getSharedPaths();
  if (!fs.existsSync(finderMenuSnapshotFile)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(finderMenuSnapshotFile, "utf8")) as FinderMenuSnapshot;
  } catch {
    return null;
  }
}
