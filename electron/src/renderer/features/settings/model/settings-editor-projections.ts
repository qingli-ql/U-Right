import type { ActionCategory, AppSettings, FinderActionContext } from "../../../../contracts/contracts";
import {
  ACTION_CATEGORY_META,
  ACTION_DEFINITIONS
} from "../../../../contracts/action-registry";
import type { ActionDefinition, SettingsActionInspectorItem, SettingsCategoryWorkbenchItem } from "../../../../contracts/action-registry";
import {
  buildSettingsActionInspectorItems as buildSettingsActionInspectorItemsOwner,
  buildSettingsCategoryWorkbenchItems as buildSettingsCategoryWorkbenchItemsOwner
} from "../../../../domain/actions/action-projection-service";

const STATIC_DEFINITIONS = ACTION_DEFINITIONS as ActionDefinition[];

export function buildSettingsActionInspectorProjection(
  category: ActionCategory,
  context: FinderActionContext,
  settings: AppSettings
): SettingsActionInspectorItem[] {
  return buildSettingsActionInspectorItemsOwner(
    STATIC_DEFINITIONS,
    ACTION_CATEGORY_META,
    category,
    context,
    settings
  ) as SettingsActionInspectorItem[];
}

export function buildSettingsCategoryWorkbenchProjection(
  context: FinderActionContext,
  settings: AppSettings
): SettingsCategoryWorkbenchItem[] {
  return buildSettingsCategoryWorkbenchItemsOwner(
    STATIC_DEFINITIONS,
    ACTION_CATEGORY_META,
    context,
    settings
  ) as SettingsCategoryWorkbenchItem[];
}

export function buildAllSettingsActionInspectorProjection(
  context: FinderActionContext,
  settings: AppSettings
): SettingsActionInspectorItem[] {
  return ACTION_CATEGORY_META.flatMap((meta) => buildSettingsActionInspectorProjection(meta.category, context, settings));
}
