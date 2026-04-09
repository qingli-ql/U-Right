import type { AppSettings } from "../../../../contracts/contracts";
import type { SettingsEditorAction } from "./settings-editor-actions";
import {
  applyActionPatch as applyActionPatchToSettings,
  applyCategoryPatch as applyCategoryPatchToSettings,
  applyCategoryReorder as applyCategoryReorderToSettings,
  moveActionInWorkbench as moveActionInWorkbenchSettings,
  resetActionToDefault,
  resetCategoryToDefault
} from "./settings-editor-mutations";
import { normalizeSettingsEditorState, type SettingsEditorState } from "./settings-editor-state";

export function settingsEditorReducer(state: SettingsEditorState, action: SettingsEditorAction): SettingsEditorState {
  switch (action.type) {
    case "hydrateSettings":
    case "replaceSettings":
      return normalizeSettingsEditorState({
        ...state,
        settings: action.settings
      });
    case "setSection":
      return {
        ...state,
        section: action.section
      };
    case "selectCategory":
      return {
        ...state,
        selectedCategory: action.category,
        selectedMenuActionID: null
      };
    case "selectMenuAction":
      return {
        ...state,
        selectedMenuActionID: action.actionID
      };
    case "selectTemplate":
      return {
        ...state,
        selectedTemplateID: action.templateID
      };
    case "selectOpenAction":
      return {
        ...state,
        selectedOpenActionID: action.actionID
      };
    case "setDraggedCategory":
      return {
        ...state,
        dragState: {
          ...state.dragState,
          draggedCategory: action.category
        }
      };
    case "setDraggedAction":
      return {
        ...state,
        dragState: {
          ...state.dragState,
          draggedActionID: action.actionID
        }
      };
    case "setDragHoverCategory":
      return {
        ...state,
        dragState: {
          ...state.dragState,
          dragHoverCategory: action.category
        }
      };
    case "setDragHoverAction":
      return {
        ...state,
        dragState: {
          ...state.dragState,
          dragHoverActionID: action.actionID
        }
      };
    case "patchGeneral":
      return withSettings(state, {
        ...state.settings,
        general: {
          ...state.settings.general,
          ...action.patch
        }
      });
    case "patchIntegrations":
      return withSettings(state, {
        ...state.settings,
        integrations: {
          ...state.settings.integrations,
          ...action.patch
        }
      });
    case "patchTemplates":
      return withSettings(state, {
        ...state.settings,
        templates: {
          ...state.settings.templates,
          ...action.patch
        }
      });
    case "patchAI":
      return withSettings(state, {
        ...state.settings,
        ai: {
          ...state.settings.ai,
          ...action.patch
        }
      });
    case "patchAdvanced":
      return withSettings(state, {
        ...state.settings,
        advanced: {
          ...state.settings.advanced,
          ...action.patch
        }
      });
    case "patchCustomActions":
      return withSettings(state, {
        ...state.settings,
        customActions: {
          ...state.settings.customActions,
          ...action.patch
        }
      });
    case "patchCategory":
      return withSettings(state, applyCategoryPatchToSettings(state.settings, action.category, action.patch));
    case "patchCategoryDisplayStyle":
      return withSettings(state, applyCategoryPatchToSettings(state.settings, action.category, { displayStyle: action.displayStyle }));
    case "patchAction":
      return withSettings(state, applyActionPatchToSettings(state.settings, action.actionID, action.patch));
    case "moveCategory":
      return withSettings(state, applyCategoryReorderToSettings(state.settings, action.orderedCategories));
    case "moveAction":
      return normalizeSettingsEditorState({
        ...withSettings(state, moveActionInWorkbenchSettings(state.settings, action.actionID, action.targetCategory, action.targetIndex)),
        selectedCategory: action.targetCategory,
        selectedMenuActionID: action.actionID
      });
    case "resetAction":
      return withSettings(state, resetActionToDefault(state.settings, action.actionID));
    case "resetCategory":
      return withSettings(state, resetCategoryToDefault(state.settings, action.category));
    case "addTemplate":
      return normalizeSettingsEditorState({
        ...withSettings(state, {
          ...state.settings,
          templates: {
            ...state.settings.templates,
            userTemplates: [...state.settings.templates.userTemplates, action.template]
          }
        }),
        selectedTemplateID: action.template.id
      });
    case "updateSelectedTemplate":
      if (!state.selectedTemplateID) {
        return state;
      }
      return withSettings(state, {
        ...state.settings,
        templates: {
          ...state.settings.templates,
          userTemplates: state.settings.templates.userTemplates.map((item) =>
            item.id === state.selectedTemplateID ? { ...item, ...action.patch } : item
          )
        }
      });
    case "removeSelectedTemplate":
      if (!state.selectedTemplateID) {
        return state;
      }
      return normalizeSettingsEditorState({
        ...withSettings(state, {
          ...state.settings,
          templates: {
            ...state.settings.templates,
            userTemplates: state.settings.templates.userTemplates.filter((item) => item.id !== state.selectedTemplateID)
          }
        }),
        selectedTemplateID: null
      });
    case "addOpenAction":
      return normalizeSettingsEditorState({
        ...withSettings(state, {
          ...state.settings,
          customActions: {
            ...state.settings.customActions,
            openActions: [...state.settings.customActions.openActions, action.openAction]
          }
        }),
        selectedOpenActionID: action.openAction.id
      });
    case "updateSelectedOpenAction":
      if (!state.selectedOpenActionID) {
        return state;
      }
      return withSettings(state, {
        ...state.settings,
        customActions: {
          ...state.settings.customActions,
          openActions: state.settings.customActions.openActions.map((item) =>
            item.id === state.selectedOpenActionID ? { ...item, ...action.patch } : item
          )
        }
      });
    case "toggleOpenAction":
      return withSettings(state, {
        ...state.settings,
        customActions: {
          ...state.settings.customActions,
          openActions: state.settings.customActions.openActions.map((item) =>
            item.id === action.actionID ? { ...item, isEnabled: action.isEnabled } : item
          )
        }
      });
    case "removeSelectedOpenAction":
      if (!state.selectedOpenActionID) {
        return state;
      }
      return normalizeSettingsEditorState({
        ...withSettings(state, {
          ...state.settings,
          customActions: {
            ...state.settings.customActions,
            openActions: state.settings.customActions.openActions.filter((item) => item.id !== state.selectedOpenActionID)
          }
        }),
        selectedOpenActionID: null
      });
    default:
      return state;
  }
}

function withSettings(state: SettingsEditorState, settings: AppSettings): SettingsEditorState {
  return normalizeSettingsEditorState({
    ...state,
    settings
  });
}
