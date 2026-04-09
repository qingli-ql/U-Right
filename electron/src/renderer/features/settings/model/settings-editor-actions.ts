import type {
  ActionCategory,
  AppSettings,
  CustomOpenAction,
  MenuActionSettings,
  MenuCategoryDisplayStyle,
  MenuCategorySettings,
  UserTemplateItem
} from "../../../../contracts/contracts";
import type { SettingsSectionKey } from "../../../components/settings-sidebar";

export type SettingsEditorAction =
  | { type: "hydrateSettings"; settings: AppSettings }
  | { type: "replaceSettings"; settings: AppSettings }
  | { type: "setSection"; section: SettingsSectionKey }
  | { type: "selectCategory"; category: ActionCategory }
  | { type: "selectMenuAction"; actionID: string | null }
  | { type: "selectTemplate"; templateID: string | null }
  | { type: "selectOpenAction"; actionID: string | null }
  | { type: "setDraggedCategory"; category: ActionCategory | null }
  | { type: "setDraggedAction"; actionID: string | null }
  | { type: "setDragHoverCategory"; category: ActionCategory | null }
  | { type: "setDragHoverAction"; actionID: string | null }
  | { type: "patchGeneral"; patch: Partial<AppSettings["general"]> }
  | { type: "patchIntegrations"; patch: Partial<AppSettings["integrations"]> }
  | { type: "patchTemplates"; patch: Partial<AppSettings["templates"]> }
  | { type: "patchAI"; patch: Partial<AppSettings["ai"]> }
  | { type: "patchAdvanced"; patch: Partial<AppSettings["advanced"]> }
  | { type: "patchCustomActions"; patch: Partial<AppSettings["customActions"]> }
  | { type: "patchCategory"; category: ActionCategory; patch: Partial<MenuCategorySettings> }
  | { type: "patchCategoryDisplayStyle"; category: ActionCategory; displayStyle: MenuCategoryDisplayStyle }
  | { type: "patchAction"; actionID: string; patch: Partial<MenuActionSettings> }
  | { type: "moveCategory"; orderedCategories: ActionCategory[] }
  | { type: "moveAction"; actionID: string; targetCategory: ActionCategory; targetIndex: number }
  | { type: "resetAction"; actionID: string }
  | { type: "resetCategory"; category: ActionCategory }
  | { type: "addTemplate"; template: UserTemplateItem }
  | { type: "updateSelectedTemplate"; patch: Partial<UserTemplateItem> }
  | { type: "removeSelectedTemplate" }
  | { type: "addOpenAction"; openAction: CustomOpenAction }
  | { type: "updateSelectedOpenAction"; patch: Partial<CustomOpenAction> }
  | { type: "toggleOpenAction"; actionID: string; isEnabled: boolean }
  | { type: "removeSelectedOpenAction" };

export const hydrateSettings = (settings: AppSettings): SettingsEditorAction => ({ type: "hydrateSettings", settings });
export const replaceSettings = (settings: AppSettings): SettingsEditorAction => ({ type: "replaceSettings", settings });
export const setSection = (section: SettingsSectionKey): SettingsEditorAction => ({ type: "setSection", section });
export const selectCategory = (category: ActionCategory): SettingsEditorAction => ({ type: "selectCategory", category });
export const selectMenuAction = (actionID: string | null): SettingsEditorAction => ({ type: "selectMenuAction", actionID });
export const selectTemplate = (templateID: string | null): SettingsEditorAction => ({ type: "selectTemplate", templateID });
export const selectOpenAction = (actionID: string | null): SettingsEditorAction => ({ type: "selectOpenAction", actionID });
export const setDraggedCategory = (category: ActionCategory | null): SettingsEditorAction => ({ type: "setDraggedCategory", category });
export const setDraggedAction = (actionID: string | null): SettingsEditorAction => ({ type: "setDraggedAction", actionID });
export const setDragHoverCategory = (category: ActionCategory | null): SettingsEditorAction => ({ type: "setDragHoverCategory", category });
export const setDragHoverAction = (actionID: string | null): SettingsEditorAction => ({ type: "setDragHoverAction", actionID });
export const patchGeneral = (patch: Partial<AppSettings["general"]>): SettingsEditorAction => ({ type: "patchGeneral", patch });
export const patchIntegrations = (patch: Partial<AppSettings["integrations"]>): SettingsEditorAction => ({ type: "patchIntegrations", patch });
export const patchTemplates = (patch: Partial<AppSettings["templates"]>): SettingsEditorAction => ({ type: "patchTemplates", patch });
export const patchAI = (patch: Partial<AppSettings["ai"]>): SettingsEditorAction => ({ type: "patchAI", patch });
export const patchAdvanced = (patch: Partial<AppSettings["advanced"]>): SettingsEditorAction => ({ type: "patchAdvanced", patch });
export const patchCustomActions = (patch: Partial<AppSettings["customActions"]>): SettingsEditorAction => ({ type: "patchCustomActions", patch });
export const patchCategory = (category: ActionCategory, patch: Partial<MenuCategorySettings>): SettingsEditorAction => ({ type: "patchCategory", category, patch });
export const patchCategoryDisplayStyle = (category: ActionCategory, displayStyle: MenuCategoryDisplayStyle): SettingsEditorAction => ({ type: "patchCategoryDisplayStyle", category, displayStyle });
export const patchAction = (actionID: string, patch: Partial<MenuActionSettings>): SettingsEditorAction => ({ type: "patchAction", actionID, patch });
export const moveCategory = (orderedCategories: ActionCategory[]): SettingsEditorAction => ({ type: "moveCategory", orderedCategories });
export const moveAction = (actionID: string, targetCategory: ActionCategory, targetIndex: number): SettingsEditorAction => ({ type: "moveAction", actionID, targetCategory, targetIndex });
export const resetAction = (actionID: string): SettingsEditorAction => ({ type: "resetAction", actionID });
export const resetCategory = (category: ActionCategory): SettingsEditorAction => ({ type: "resetCategory", category });
export const addTemplate = (template: UserTemplateItem): SettingsEditorAction => ({ type: "addTemplate", template });
export const updateSelectedTemplate = (patch: Partial<UserTemplateItem>): SettingsEditorAction => ({ type: "updateSelectedTemplate", patch });
export const removeSelectedTemplate = (): SettingsEditorAction => ({ type: "removeSelectedTemplate" });
export const addOpenAction = (openAction: CustomOpenAction): SettingsEditorAction => ({ type: "addOpenAction", openAction });
export const updateSelectedOpenAction = (patch: Partial<CustomOpenAction>): SettingsEditorAction => ({ type: "updateSelectedOpenAction", patch });
export const toggleOpenAction = (actionID: string, isEnabled: boolean): SettingsEditorAction => ({ type: "toggleOpenAction", actionID, isEnabled });
export const removeSelectedOpenAction = (): SettingsEditorAction => ({ type: "removeSelectedOpenAction" });
