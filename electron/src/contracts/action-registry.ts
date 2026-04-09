import type {
  AppSettings,
  ActionCategory,
  FinderActionContext,
  MenuActionSettings,
  MenuCategorySettings,
  SelectionKind,
  ToolAvailability,
  ToolKind
} from "./contracts";
import { GENERATED_MANIFEST_DATA } from "./generated/action-manifest";
import {
  BUILT_IN_TEMPLATE_TITLES,
  getRuntimeTemplateDefinitions,
  getUserTemplates
} from "../domain/actions/runtime-template-definitions";
import type { RuntimeTemplateDefinition } from "../domain/actions/runtime-template-definitions";
import { evaluateActionAvailability as evaluateActionAvailabilityOwner } from "../domain/actions/action-availability";
import { evaluateActionAvailabilityWithPolicies } from "../domain/actions/action-availability-service";
import {
  actionSettingFor as actionSettingForOwner,
  buildPreviewDescriptors as buildPreviewDescriptorsOwner,
  buildSettingsActionInspectorItems as buildSettingsActionInspectorItemsOwner,
  buildSettingsCategoryInspectorItems as buildSettingsCategoryInspectorItemsOwner,
  buildSettingsCategoryWorkbenchItems as buildSettingsCategoryWorkbenchItemsOwner,
  categorySettingFor as categorySettingForOwner,
  describeActionPlacement as describeActionPlacementOwner,
  resolveCategory as resolveCategoryOwner,
  resolveOrder as resolveOrderOwner
} from "../domain/actions/action-projection-service";
import {
  applyActionPatch as applyActionPatchOwner,
  applyCategoryPatch as applyCategoryPatchOwner,
  applyCategoryReorder as applyCategoryReorderOwner,
  moveActionInWorkbench as moveActionInWorkbenchOwner,
  moveSettingsAction as moveSettingsActionOwner,
  moveSettingsCategory as moveSettingsCategoryOwner,
  resetActionToDefault as resetActionToDefaultOwner,
  resetCategoryToDefault as resetCategoryToDefaultOwner,
  resetSettingsAction as resetSettingsActionOwner,
  resetSettingsCategory as resetSettingsCategoryOwner
} from "../domain/settings/settings-mutation-service";

export type ActionImplementationStatus = "implemented" | "beta" | "planned";
export type ActionChildrenPolicy = "none" | "builtInTemplates" | "scripts";

export interface ActionDefinition {
  id: string;
  title: string;
  systemImageName: string;
  defaultCategory: ActionCategory;
  supportedContexts: SelectionKind[];
  implementationStatus?: ActionImplementationStatus;
  defaultOrder: number;
  defaultVisible?: boolean;
  childrenPolicy?: ActionChildrenPolicy;
  requiredTool?: ToolKind;
  requiresAI?: boolean;
  requiresWritableTarget?: boolean;
  requiresSingleSelection?: boolean;
  requiresDirectoryContext?: boolean;
  isDestructive?: boolean;
  needsConfirmation?: boolean;
}

export interface MenuCategoryDefinition {
  category: ActionCategory;
  title: string;
  systemImageName: string;
  defaultOrder: number;
  defaultDisplayStyle: "inline" | "submenu";
}

export interface ActionAvailability {
  isVisible: boolean;
  isEnabled: boolean;
  disabledReason?: string;
}

export interface PreviewActionDescriptor {
  id: string;
  title: string;
  category: ActionCategory;
  isEnabled: boolean;
  statusBadge?: string;
  children: PreviewActionDescriptor[];
}

export interface SettingsActionInspectorItem {
  actionID: string;
  title: string;
  category: ActionCategory;
  implementationStatus: ActionImplementationStatus;
  supportedContexts: SelectionKind[];
  settingEnabled: boolean;
  appearsInCurrentContext: boolean;
  placementLabel: string;
  resolvedTargetLabel: string;
  currentReason?: string;
}

export interface SettingsCategoryWorkbenchItem {
  category: ActionCategory;
  title: string;
  order: number;
  isEnabled: boolean;
  displayStyle: "inline" | "submenu";
  actionCount: number;
  visibleActionCount: number;
}

export interface SettingsCategoryInspectorItem {
  category: ActionCategory;
  title: string;
  systemImageName: string;
  isEnabled: boolean;
  order: number;
  displayStyle: "inline" | "submenu";
  actions: SettingsActionInspectorItem[];
}

interface GeneratedActionDefinition {
  id: string;
  title: string;
  systemImageName: string;
  defaultCategory: ActionCategory;
  supportedContexts: readonly SelectionKind[];
  implementationStatus: ActionImplementationStatus;
  defaultOrder: number;
  defaultVisible: boolean;
  childrenPolicy: ActionChildrenPolicy;
  requiredTool: ToolKind | null;
  requiresAI: boolean;
  requiresWritableTarget: boolean;
  requiresSingleSelection: boolean;
  requiresDirectoryContext: boolean;
  isDestructive: boolean;
  needsConfirmation: boolean;
}

interface GeneratedCategoryDefinition {
  category: ActionCategory;
  title: string;
  systemImageName: string;
  defaultOrder: number;
  defaultDisplayStyle: "inline" | "submenu";
}

const GENERATED_MANIFEST = GENERATED_MANIFEST_DATA;

export const ACTION_CATEGORY_META: MenuCategoryDefinition[] = GENERATED_MANIFEST.categories.map((item) => ({ ...item }));

export { BUILT_IN_TEMPLATE_TITLES, getRuntimeTemplateDefinitions, getUserTemplates };
export type { RuntimeTemplateDefinition };
export { evaluateActionAvailabilityWithPolicies };

export const DEFAULT_VISIBLE_AI_ACTION_IDS = [...GENERATED_MANIFEST.defaults.defaultVisibleAIActionIDs];

export const PROMOTED_ACTION_VISIBILITY_GROUPS = GENERATED_MANIFEST.defaults.promotedActionVisibilityGroups.map((group) => [...group]) as string[][];

export const ACTION_DEFINITIONS: ActionDefinition[] = GENERATED_MANIFEST.actionDefinitions.map((item) => ({
  id: item.id,
  title: item.title,
  systemImageName: item.systemImageName,
  defaultCategory: item.defaultCategory,
  supportedContexts: [...item.supportedContexts],
  implementationStatus: item.implementationStatus,
  defaultOrder: item.defaultOrder,
  defaultVisible: item.defaultVisible,
  childrenPolicy: item.childrenPolicy,
  requiredTool: item.requiredTool ?? undefined,
  requiresAI: item.requiresAI,
  requiresWritableTarget: item.requiresWritableTarget,
  requiresSingleSelection: item.requiresSingleSelection,
  requiresDirectoryContext: item.requiresDirectoryContext,
  isDestructive: item.isDestructive,
  needsConfirmation: item.needsConfirmation
}));

export const TOOL_ORDER: ToolKind[] = [...GENERATED_MANIFEST.toolOrder];

export function definitionFor(actionID: string): ActionDefinition | undefined {
  return ACTION_DEFINITIONS.find((item) => item.id === actionID);
}

export function actionTitleFor(actionID: string): string {
  const known = definitionFor(actionID);
  if (known) {
    return known.title;
  }
  if (actionID.startsWith("create.template.")) {
    const templateID = actionID.slice("create.template.".length);
    return BUILT_IN_TEMPLATE_TITLES[templateID] ?? actionID;
  }
  if (actionID.startsWith("script.run.")) {
    return actionID.slice("script.run.".length);
  }
  return actionID;
}

export function createDefaultCategorySettings(): MenuCategorySettings[] {
  return ACTION_CATEGORY_META.map((item) => ({
    category: item.category,
    isEnabled: true,
    order: item.defaultOrder,
    displayStyle: item.defaultDisplayStyle
  }));
}

export function createDefaultActionSettings(): MenuActionSettings[] {
  return ACTION_DEFINITIONS.map((action) => ({
    actionID: action.id,
    isEnabled: action.defaultVisible ?? action.implementationStatus !== "planned",
    categoryOverride: null,
    orderOverride: null
  }));
}

export function actionSettingFor(actionID: string, settings: AppSettings) {
  return actionSettingForOwner(actionID, settings);
}

export function categorySettingFor(category: ActionCategory, settings: AppSettings) {
  return categorySettingForOwner(category, settings);
}

export function resolveCategory(definition: ActionDefinition, settings: AppSettings): ActionCategory {
  return resolveCategoryOwner(definition, settings);
}

export function resolveOrder(definition: ActionDefinition, settings: AppSettings): number {
  return resolveOrderOwner(definition, settings);
}

export function evaluateActionAvailability(definition: ActionDefinition, context: FinderActionContext, settings: AppSettings): ActionAvailability {
  return evaluateActionAvailabilityOwner(definition, context, settings);
}

export function describeActionPlacement(actionID: string, context: FinderActionContext, settings: AppSettings): string {
  return describeActionPlacementOwner(ACTION_DEFINITIONS, ACTION_CATEGORY_META, actionID, context, settings);
}

export function buildPreviewDescriptors(context: FinderActionContext, settings: AppSettings): PreviewActionDescriptor[] {
  return buildPreviewDescriptorsOwner(ACTION_DEFINITIONS, ACTION_CATEGORY_META, context, settings);
}

export function buildSettingsActionInspectorItems(category: ActionCategory, context: FinderActionContext, settings: AppSettings): SettingsActionInspectorItem[] {
  return buildSettingsActionInspectorItemsOwner(ACTION_DEFINITIONS, ACTION_CATEGORY_META, category, context, settings);
}

export function buildSettingsCategoryWorkbenchItems(context: FinderActionContext, settings: AppSettings): SettingsCategoryWorkbenchItem[] {
  return buildSettingsCategoryWorkbenchItemsOwner(ACTION_DEFINITIONS, ACTION_CATEGORY_META, context, settings);
}

export function applyCategoryReorder(settings: AppSettings, orderedCategories: ActionCategory[]): AppSettings {
  return applyCategoryReorderOwner(settings, orderedCategories);
}

export function applyCategoryPatch(
  settings: AppSettings,
  category: ActionCategory,
  patch: Partial<MenuCategorySettings>
): AppSettings {
  return applyCategoryPatchOwner(settings, category, patch);
}

export function resetCategoryToDefault(settings: AppSettings, category: ActionCategory): AppSettings {
  return resetCategoryToDefaultOwner(ACTION_CATEGORY_META, settings, category);
}

export function applyActionPatch(
  settings: AppSettings,
  actionID: string,
  patch: Partial<MenuActionSettings>
): AppSettings {
  return applyActionPatchOwner(settings, actionID, patch);
}

export function resetActionToDefault(settings: AppSettings, actionID: string): AppSettings {
  return resetActionToDefaultOwner(ACTION_DEFINITIONS, settings, actionID);
}

export function moveActionInWorkbench(
  settings: AppSettings,
  actionID: string,
  targetCategory: ActionCategory,
  targetIndex: number
): AppSettings {
  return moveActionInWorkbenchOwner(ACTION_DEFINITIONS, settings, actionID, targetCategory, targetIndex);
}

export function buildSettingsCategoryInspectorItems(context: FinderActionContext, settings: AppSettings): SettingsCategoryInspectorItem[] {
  return buildSettingsCategoryInspectorItemsOwner(ACTION_DEFINITIONS, ACTION_CATEGORY_META, context, settings);
}

export function moveSettingsAction(settings: AppSettings, actionID: string, targetCategory: ActionCategory, targetIndex: number): AppSettings {
  return moveSettingsActionOwner(ACTION_DEFINITIONS, settings, actionID, targetCategory, targetIndex);
}

export function moveSettingsCategory(settings: AppSettings, category: ActionCategory, targetIndex: number): AppSettings {
  return moveSettingsCategoryOwner(ACTION_CATEGORY_META, settings, category, targetIndex);
}

export function resetSettingsAction(settings: AppSettings, actionID: string): AppSettings {
  return resetSettingsActionOwner(ACTION_DEFINITIONS, settings, actionID);
}

export function resetSettingsCategory(settings: AppSettings, category: ActionCategory): AppSettings {
  return resetSettingsCategoryOwner(ACTION_CATEGORY_META, settings, category);
}

export function createPreviewContext(
  selectionKind: SelectionKind,
  detectedTools: Partial<Record<ToolKind, ToolAvailability>>,
  options?: { scriptNames?: string[]; hasWritableTarget?: boolean; hasWorkingDirectory?: boolean }
): FinderActionContext {
  const capabilities = {
    hasWorkingDirectory: options?.hasWorkingDirectory ?? true,
    hasWritableTarget: options?.hasWritableTarget ?? true,
    scriptNames: options?.scriptNames ?? []
  };
  switch (selectionKind) {
    case "file":
      return {
        selectionKind,
        selectedURLs: ["/Users/demo/project/src/index.ts"],
        primaryURL: "/Users/demo/project/src/index.ts",
        currentDirectoryURL: "/Users/demo/project/src",
        detectedTools,
        capabilities,
        fileMetadata: [{ url: "/Users/demo/project/src/index.ts", isDirectory: false, fileExtension: "ts", isScriptLike: false }],
        extensionWindowTitle: "preview-file"
      };
    case "folder":
      return {
        selectionKind,
        selectedURLs: ["/Users/demo/project"],
        primaryURL: "/Users/demo/project",
        currentDirectoryURL: "/Users/demo",
        detectedTools,
        capabilities,
        fileMetadata: [{ url: "/Users/demo/project", isDirectory: true, fileExtension: "", isScriptLike: false }],
        extensionWindowTitle: "preview-folder"
      };
    case "multi":
      return {
        selectionKind,
        selectedURLs: ["/Users/demo/project/src/index.ts", "/Users/demo/project/package.json"],
        primaryURL: "/Users/demo/project/src/index.ts",
        currentDirectoryURL: "/Users/demo/project",
        detectedTools,
        capabilities,
        fileMetadata: [
          { url: "/Users/demo/project/src/index.ts", isDirectory: false, fileExtension: "ts", isScriptLike: false },
          { url: "/Users/demo/project/package.json", isDirectory: false, fileExtension: "json", isScriptLike: false }
        ],
        extensionWindowTitle: "preview-multi"
      };
    case "empty":
      return {
        selectionKind,
        selectedURLs: [],
        primaryURL: null,
        currentDirectoryURL: "/Users/demo/project",
        detectedTools,
        capabilities,
        fileMetadata: [],
        extensionWindowTitle: "preview-empty"
      };
    case "mixed":
    default:
      return {
        selectionKind: "mixed",
        selectedURLs: ["/Users/demo/project/src/index.ts", "/Users/demo/project/assets"],
        primaryURL: "/Users/demo/project/src/index.ts",
        currentDirectoryURL: "/Users/demo/project",
        detectedTools,
        capabilities,
        fileMetadata: [
          { url: "/Users/demo/project/src/index.ts", isDirectory: false, fileExtension: "ts", isScriptLike: false },
          { url: "/Users/demo/project/assets", isDirectory: true, fileExtension: "", isScriptLike: false }
        ],
        extensionWindowTitle: "preview-mixed"
      };
  }
}
