import type {
  AppSettings,
  StoredSettingsDocument,
  StoredSettingsV3
} from "../../../contracts/contracts";
import { createDefaultSettings } from "../../../contracts/defaults";
import {
  createDefaultActionSettings,
  createDefaultCategorySettings,
  DEFAULT_VISIBLE_AI_ACTION_IDS,
  PROMOTED_ACTION_VISIBILITY_GROUPS,
  TOOL_ORDER
} from "../../../contracts/action-registry";

export const SETTINGS_VERSION = 3;

type LegacySettingsV2 = Partial<{
  launchAtLogin: boolean;
  showMenuBarIcon: boolean;
  showExtensionStatus: boolean;
  defaultTerminal: StoredSettingsV3["integrations"]["defaultTerminal"];
  defaultEditor: StoredSettingsV3["integrations"]["defaultEditor"];
  aiEnabled: boolean;
  preferredAIProvider: StoredSettingsV3["ai"]["preferredProvider"];
  apiBaseURL: string;
  apiKey: string;
  apiModel: string;
  systemPromptTemplate: string;
  maxContextFileSize: number;
  maxFolderScanDepth: number;
  includeHiddenFiles: boolean;
  customTemplateFolder: string;
  debugLogging: boolean;
  customExecutablePaths: Record<string, string>;
  pinnedActionIDs: string[];
  recentActionIDs: string[];
  lastAIActionID: string | null;
  contextMenu: Partial<StoredSettingsV3["contextMenu"]>;
  toolPreferences: StoredSettingsV3["integrations"]["toolPreferences"];
  aiActionVisibility: string[];
  general: Partial<StoredSettingsV3["general"]>;
  integrations: Partial<StoredSettingsV3["integrations"]>;
  templates: Partial<StoredSettingsV3["templates"]>;
  ai: Partial<StoredSettingsV3["ai"]>;
  customActions: Partial<StoredSettingsV3["customActions"]>;
  advanced: Partial<StoredSettingsV3["advanced"]>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function buildLegacyProfile(legacy: LegacySettingsV2, defaults: StoredSettingsV3): StoredSettingsV3["ai"]["profiles"] {
  return [{
    ...defaults.ai.profiles[0],
    apiBaseURL: typeof legacy.apiBaseURL === "string" ? legacy.apiBaseURL : defaults.ai.profiles[0].apiBaseURL,
    apiKey: typeof legacy.apiKey === "string" ? legacy.apiKey : defaults.ai.profiles[0].apiKey,
    apiModel: typeof legacy.apiModel === "string" ? legacy.apiModel : defaults.ai.profiles[0].apiModel
  }];
}

function buildLegacyPromptPolicies(legacy: LegacySettingsV2, defaults: StoredSettingsV3): StoredSettingsV3["ai"]["promptPolicies"] {
  return [{
    ...defaults.ai.promptPolicies[0],
    systemPromptTemplate: typeof legacy.systemPromptTemplate === "string"
      ? legacy.systemPromptTemplate
      : defaults.ai.promptPolicies[0].systemPromptTemplate,
    maxContextFileSize: typeof legacy.maxContextFileSize === "number"
      ? legacy.maxContextFileSize
      : defaults.ai.promptPolicies[0].maxContextFileSize,
    maxFolderScanDepth: typeof legacy.maxFolderScanDepth === "number"
      ? legacy.maxFolderScanDepth
      : defaults.ai.promptPolicies[0].maxFolderScanDepth,
    includeHiddenFiles: typeof legacy.includeHiddenFiles === "boolean"
      ? legacy.includeHiddenFiles
      : defaults.ai.promptPolicies[0].includeHiddenFiles
  }];
}

export function migrateStoredSettingsToV3(rawSettings: unknown, sourceVersion = 0): StoredSettingsV3 | null {
  const defaults = createDefaultSettings();
  if (!isRecord(rawSettings)) {
    return null;
  }

  const legacy = rawSettings as LegacySettingsV2 & Record<string, unknown>;
  const rawGeneral = asRecord(legacy.general);
  const rawIntegrations = asRecord(legacy.integrations);
  const rawTemplates = asRecord(legacy.templates);
  const rawAI = asRecord(legacy.ai);
  const rawCustomActions = asRecord(legacy.customActions);
  const rawAdvanced = asRecord(legacy.advanced);
  const rawContextMenu = asRecord(legacy.contextMenu);

  const flatCustomExecutablePaths = asStringRecord(legacy.customExecutablePaths);
  const nestedCustomExecutablePaths = asStringRecord(rawIntegrations.customExecutablePaths);
  const profiles = asArray<StoredSettingsV3["ai"]["profiles"][number]>(rawAI.profiles)
    ?? buildLegacyProfile(legacy, defaults);
  const promptPolicies = asArray<StoredSettingsV3["ai"]["promptPolicies"][number]>(rawAI.promptPolicies)
    ?? buildLegacyPromptPolicies(legacy, defaults);

  const migrated: StoredSettingsV3 = {
    pinnedActionIDs: Array.isArray(legacy.pinnedActionIDs)
      ? legacy.pinnedActionIDs
      : defaults.pinnedActionIDs,
    recentActionIDs: Array.isArray(legacy.recentActionIDs)
      ? legacy.recentActionIDs
      : defaults.recentActionIDs,
    lastAIActionID: typeof legacy.lastAIActionID === "string" || legacy.lastAIActionID === null
      ? legacy.lastAIActionID
      : defaults.lastAIActionID,
    contextMenu: {
      ...defaults.contextMenu,
      ...rawContextMenu
    },
    general: {
      launchAtLogin: (rawGeneral.launchAtLogin as boolean | undefined)
        ?? (legacy.launchAtLogin as boolean | undefined)
        ?? defaults.general.launchAtLogin,
      showMenuBarIcon: (rawGeneral.showMenuBarIcon as boolean | undefined)
        ?? (legacy.showMenuBarIcon as boolean | undefined)
        ?? defaults.general.showMenuBarIcon,
      showExtensionStatus: (rawGeneral.showExtensionStatus as boolean | undefined)
        ?? (legacy.showExtensionStatus as boolean | undefined)
        ?? defaults.general.showExtensionStatus
    },
    integrations: {
      defaultTerminal: (rawIntegrations.defaultTerminal as StoredSettingsV3["integrations"]["defaultTerminal"] | undefined)
        ?? legacy.defaultTerminal
        ?? defaults.integrations.defaultTerminal,
      defaultEditor: (rawIntegrations.defaultEditor as StoredSettingsV3["integrations"]["defaultEditor"] | undefined)
        ?? legacy.defaultEditor
        ?? defaults.integrations.defaultEditor,
      toolPreferences: asArray<StoredSettingsV3["integrations"]["toolPreferences"][number]>(rawIntegrations.toolPreferences)
        ?? legacy.toolPreferences
        ?? defaults.integrations.toolPreferences,
      customExecutablePaths: {
        ...defaults.integrations.customExecutablePaths,
        ...flatCustomExecutablePaths,
        ...nestedCustomExecutablePaths
      }
    },
    templates: {
      customTemplateFolder: (rawTemplates.customTemplateFolder as string | undefined)
        ?? legacy.customTemplateFolder
        ?? defaults.templates.customTemplateFolder,
      userTemplates: Array.isArray(rawTemplates.userTemplates)
        ? (rawTemplates.userTemplates as StoredSettingsV3["templates"]["userTemplates"])
        : defaults.templates.userTemplates,
      extensionDefaults: Array.isArray(rawTemplates.extensionDefaults)
        ? (rawTemplates.extensionDefaults as StoredSettingsV3["templates"]["extensionDefaults"])
        : defaults.templates.extensionDefaults,
      hiddenBuiltInTemplateIDs: Array.isArray(rawTemplates.hiddenBuiltInTemplateIDs)
        ? (rawTemplates.hiddenBuiltInTemplateIDs as StoredSettingsV3["templates"]["hiddenBuiltInTemplateIDs"])
        : defaults.templates.hiddenBuiltInTemplateIDs
    },
    ai: {
      enabled: (rawAI.enabled as boolean | undefined)
        ?? (legacy.aiEnabled as boolean | undefined)
        ?? defaults.ai.enabled,
      preferredProvider: (rawAI.preferredProvider as StoredSettingsV3["ai"]["preferredProvider"] | undefined)
        ?? legacy.preferredAIProvider
        ?? defaults.ai.preferredProvider,
      profiles,
      defaultProfileID: (rawAI.defaultProfileID as string | null | undefined) ?? defaults.ai.defaultProfileID,
      promptPolicies,
      defaultPromptPolicyID: (rawAI.defaultPromptPolicyID as string | null | undefined) ?? defaults.ai.defaultPromptPolicyID,
      actionVisibility: Array.isArray(rawAI.actionVisibility)
        ? (rawAI.actionVisibility as string[])
        : Array.isArray(legacy.aiActionVisibility)
          ? legacy.aiActionVisibility
          : DEFAULT_VISIBLE_AI_ACTION_IDS
    },
    customActions: {
      openActions: Array.isArray(rawCustomActions.openActions)
        ? (rawCustomActions.openActions as StoredSettingsV3["customActions"]["openActions"])
        : defaults.customActions.openActions
    },
    advanced: {
      debugLogging: (rawAdvanced.debugLogging as boolean | undefined)
        ?? (legacy.debugLogging as boolean | undefined)
        ?? defaults.advanced.debugLogging
    }
  };

  return normalizeSettings(migrated, sourceVersion);
}

export function normalizeSettings(settings: StoredSettingsV3, sourceVersion = SETTINGS_VERSION): AppSettings {
  const defaults = createDefaultSettings();
  const normalized: AppSettings = {
    pinnedActionIDs: Array.isArray(settings.pinnedActionIDs) ? settings.pinnedActionIDs : defaults.pinnedActionIDs,
    recentActionIDs: Array.isArray(settings.recentActionIDs) ? settings.recentActionIDs : defaults.recentActionIDs,
    lastAIActionID: typeof settings.lastAIActionID === "string" || settings.lastAIActionID === null
      ? settings.lastAIActionID
      : defaults.lastAIActionID,
    contextMenu: {
      ...defaults.contextMenu,
      ...(settings.contextMenu ?? {})
    },
    general: {
      ...defaults.general,
      ...(settings.general ?? {})
    },
    integrations: {
      ...defaults.integrations,
      ...(settings.integrations ?? {}),
      customExecutablePaths: {
        ...defaults.integrations.customExecutablePaths,
        ...asStringRecord(settings.integrations?.customExecutablePaths)
      }
    },
    templates: {
      ...defaults.templates,
      ...(settings.templates ?? {})
    },
    ai: {
      ...defaults.ai,
      ...(settings.ai ?? {})
    },
    customActions: {
      ...defaults.customActions,
      ...(settings.customActions ?? {})
    },
    advanced: {
      ...defaults.advanced,
      ...(settings.advanced ?? {})
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

export function decodeSettingsDocument(data: string): StoredSettingsDocument | null {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (isRecord(parsed) && "settings" in parsed) {
      const sourceVersion = typeof parsed.version === "number" ? parsed.version : 0;
      const migrated = migrateStoredSettingsToV3(parsed.settings, sourceVersion);
      if (!migrated) {
        return null;
      }
      return {
        version: sourceVersion,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
        settings: normalizeSettings(migrated, sourceVersion)
      };
    }
    const migrated = migrateStoredSettingsToV3(parsed, 0);
    if (!migrated) {
      return null;
    }
    return {
      version: 0,
      updatedAt: new Date(0).toISOString(),
      settings: normalizeSettings(migrated, 0)
    };
  } catch {
    return null;
  }
}
