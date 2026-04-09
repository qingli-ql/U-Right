import type { ActionCategory, AppSettings } from "../../../../contracts/contracts";
import { createDefaultSettings } from "../../../../contracts/defaults";
import type { SettingsSectionKey } from "../../../components/settings-sidebar";

export interface SettingsEditorDragState {
  draggedCategory: ActionCategory | null;
  draggedActionID: string | null;
  dragHoverCategory: ActionCategory | null;
  dragHoverActionID: string | null;
}

export interface SettingsEditorState {
  settings: AppSettings;
  section: SettingsSectionKey;
  selectedCategory: ActionCategory | null;
  selectedMenuActionID: string | null;
  selectedTemplateID: string | null;
  selectedOpenActionID: string | null;
  dragState: SettingsEditorDragState;
}

export function createInitialSettingsEditorState(settings: AppSettings = createDefaultSettings()): SettingsEditorState {
  return normalizeSettingsEditorState({
    settings,
    section: "context-menu",
    selectedCategory: null,
    selectedMenuActionID: null,
    selectedTemplateID: null,
    selectedOpenActionID: null,
    dragState: {
      draggedCategory: null,
      draggedActionID: null,
      dragHoverCategory: null,
      dragHoverActionID: null
    }
  });
}

export function normalizeSettingsEditorState(state: SettingsEditorState): SettingsEditorState {
  const availableCategories = state.settings.contextMenu.categorySettings.map((item) => item.category);
  const selectedCategory = state.selectedCategory && availableCategories.includes(state.selectedCategory)
    ? state.selectedCategory
    : (availableCategories[0] ?? null);
  const selectedTemplateID = state.selectedTemplateID && state.settings.templates.userTemplates.some((item) => item.id === state.selectedTemplateID)
    ? state.selectedTemplateID
    : (state.settings.templates.userTemplates[0]?.id ?? null);
  const selectedOpenActionID = state.selectedOpenActionID && state.settings.customActions.openActions.some((item) => item.id === state.selectedOpenActionID)
    ? state.selectedOpenActionID
    : (state.settings.customActions.openActions[0]?.id ?? null);
  const selectedMenuActionID = state.selectedMenuActionID && state.settings.contextMenu.actionSettings.some((item) => item.actionID === state.selectedMenuActionID)
    ? state.selectedMenuActionID
    : null;

  return {
    ...state,
    selectedCategory,
    selectedMenuActionID,
    selectedTemplateID,
    selectedOpenActionID,
    dragState: {
      draggedCategory: state.dragState.draggedCategory && availableCategories.includes(state.dragState.draggedCategory)
        ? state.dragState.draggedCategory
        : null,
      draggedActionID: state.dragState.draggedActionID && state.settings.contextMenu.actionSettings.some((item) => item.actionID === state.dragState.draggedActionID)
        ? state.dragState.draggedActionID
        : null,
      dragHoverCategory: state.dragState.dragHoverCategory && availableCategories.includes(state.dragState.dragHoverCategory)
        ? state.dragState.dragHoverCategory
        : null,
      dragHoverActionID: state.dragState.dragHoverActionID && state.settings.contextMenu.actionSettings.some((item) => item.actionID === state.dragState.dragHoverActionID)
        ? state.dragState.dragHoverActionID
        : null
    }
  };
}
