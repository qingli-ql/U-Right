import { useMemo } from "react";
import type {
  ActionCategory,
  AppDiagnostics,
  FinderActionContext,
  FinderMenuSnapshotAction
} from "../../../../contracts/contracts";
import {
  ACTION_CATEGORY_META,
  ACTION_DEFINITIONS
} from "../../../../contracts/action-registry";
import type { ToolAvailabilityMap } from "../../../hooks/use-settings-persistence";
import {
  buildSettingsActionInspectorItems,
  buildSettingsCategoryWorkbenchItems
} from "../../../../domain/actions/action-projection-service";
import type { SettingsEditorState } from "./settings-editor-state";

export type WorkbenchCategory = ReturnType<typeof buildSettingsCategoryWorkbenchItems>[number];
export type WorkbenchAction = ReturnType<typeof buildSettingsActionInspectorItems>[number];

type ActionInspectorItem = Pick<WorkbenchAction, "actionID" | "settingEnabled" | "appearsInCurrentContext" | "currentReason">;

export interface ContextMenuWorkbenchViewModel {
  actualSnapshot: AppDiagnostics["finderMenuSnapshot"] | null;
  actualContext: FinderActionContext;
  actualMenu: FinderMenuSnapshotAction[];
  consistencyErrors: string[];
  hasContextMenuConsistencyError: boolean;
  categories: WorkbenchCategory[];
  categoryActions: WorkbenchAction[];
  enabledCategoryCount: number;
  enabledActionCount: number;
  selectedCategory: WorkbenchCategory["category"] | null;
  selectedCategoryMeta: WorkbenchCategory | null;
  selectedMenuAction: WorkbenchAction | null;
  finderSnapshotDiff: string[];
}

export function useContextMenuWorkbenchViewModel(
  state: SettingsEditorState,
  tools: ToolAvailabilityMap,
  diagnostics: AppDiagnostics | null
): ContextMenuWorkbenchViewModel {
  return useMemo(() => selectContextMenuWorkbenchViewModel(state, tools, diagnostics), [diagnostics, state, tools]);
}

export function selectContextMenuWorkbenchViewModel(
  state: SettingsEditorState,
  tools: ToolAvailabilityMap,
  diagnostics: AppDiagnostics | null
): ContextMenuWorkbenchViewModel {
  const actualSnapshot = diagnostics?.finderMenuSnapshot ?? null;
  const actualContext = actualSnapshot?.context ?? createFallbackFinderContext(tools, diagnostics?.availableScriptNames ?? []);
  const actualMenu = actualSnapshot?.menu ?? [];
  const consistencyErrors = diagnostics?.errors ?? [];
  const hasContextMenuConsistencyError = consistencyErrors.length > 0;
  const categories = selectWorkbenchCategories(actualContext, state.settings);
  const selectedCategory = categories.find((item) => item.category === state.selectedCategory)?.category ?? categories[0]?.category ?? null;
  const categoryActions = selectedCategory == null
    ? []
    : selectWorkbenchActions(selectedCategory, actualContext, state.settings);
  const allActionInspectorItems = categories.flatMap((item) => selectWorkbenchActions(item.category, actualContext, state.settings));
  const selectedCategoryMeta = categories.find((item) => item.category === selectedCategory) ?? categories[0] ?? null;
  const selectedMenuAction = categoryActions.find((item) => item.actionID === state.selectedMenuActionID) ?? categoryActions[0] ?? null;

  return {
    actualSnapshot,
    actualContext,
    actualMenu,
    consistencyErrors,
    hasContextMenuConsistencyError,
    categories,
    categoryActions,
    enabledCategoryCount: categories.filter((item) => item.isEnabled).length,
    enabledActionCount: categoryActions.filter((item) => item.settingEnabled).length,
    selectedCategory,
    selectedCategoryMeta,
    selectedMenuAction,
    finderSnapshotDiff: buildActualMenuDiff(allActionInspectorItems, actualMenu)
  };
}

export function selectSelectedTemplate(state: SettingsEditorState) {
  return state.settings.templates.userTemplates.find((item) => item.id === state.selectedTemplateID) ?? null;
}

export function selectSelectedOpenAction(state: SettingsEditorState) {
  return state.settings.customActions.openActions.find((item) => item.id === state.selectedOpenActionID) ?? null;
}

export function selectWorkbenchCategories(
  context: FinderActionContext,
  settings: SettingsEditorState["settings"]
): WorkbenchCategory[] {
  return buildSettingsCategoryWorkbenchItems(ACTION_DEFINITIONS, ACTION_CATEGORY_META, context, settings);
}

export function selectWorkbenchActions(
  category: ActionCategory,
  context: FinderActionContext,
  settings: SettingsEditorState["settings"]
): WorkbenchAction[] {
  return buildSettingsActionInspectorItems(ACTION_DEFINITIONS, ACTION_CATEGORY_META, category, context, settings);
}

function createFallbackFinderContext(
  tools: ToolAvailabilityMap,
  scriptNames: string[]
): FinderActionContext {
  return {
    selectedURLs: [],
    primaryURL: null,
    currentDirectoryURL: null,
    resolvedTargetDirectory: null,
    resolvedPrimaryTarget: null,
    resolvedSelectionDirectory: null,
    selectionKind: "empty",
    detectedTools: tools,
    fileMetadata: [],
    capabilities: {
      hasWorkingDirectory: false,
      hasWritableTarget: false,
      scriptNames
    }
  };
}

function buildActualMenuDiff(
  configuredActions: ActionInspectorItem[],
  actualMenu: FinderMenuSnapshotAction[]
): string[] {
  const actual = new Set(flattenSnapshotActionIDs(actualMenu));
  const diff = configuredActions.flatMap((action) => {
    if (!action.settingEnabled) {
      return [];
    }
    if (actual.has(action.actionID)) {
      return [`Appears in actual menu: ${action.actionID}`];
    }
    return [`Configured but missing in actual menu: ${action.actionID}${action.currentReason ? ` (${action.currentReason})` : ""}`];
  });
  for (const actionID of [...actual].filter((id) => !configuredActions.some((item) => item.actionID === id))) {
    diff.push(`Only in actual menu: ${actionID}`);
  }
  return diff.sort();
}

function flattenSnapshotActionIDs(
  descriptors: FinderMenuSnapshotAction[],
  output: string[] = []
): string[] {
  for (const descriptor of descriptors) {
    if (descriptor.children.length === 0) {
      output.push(descriptor.id);
      continue;
    }
    flattenSnapshotActionIDs(descriptor.children, output);
  }
  return output;
}
