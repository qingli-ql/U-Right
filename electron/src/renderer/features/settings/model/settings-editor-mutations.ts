import type {
  ActionCategory,
  AppSettings,
  MenuActionSettings,
  MenuCategorySettings
} from "../../../../contracts/contracts";
import { GENERATED_MANIFEST_DATA } from "../../../../contracts/generated/action-manifest";
import {
  applyActionPatch as applyActionPatchOwner,
  applyCategoryPatch as applyCategoryPatchOwner,
  applyCategoryReorder as applyCategoryReorderOwner,
  moveActionInWorkbench as moveActionInWorkbenchOwner,
  resetActionToDefault as resetActionToDefaultOwner,
  resetCategoryToDefault as resetCategoryToDefaultOwner
} from "../../../../domain/settings/settings-mutation-service";
import type {
  MutationActionDefinition,
  MutationCategoryDefinition
} from "../../../../domain/settings/settings-mutation-service";

const CATEGORY_META: MutationCategoryDefinition[] = GENERATED_MANIFEST_DATA.categories.map((category) => ({
  category: category.category,
  defaultOrder: category.defaultOrder,
  defaultDisplayStyle: category.defaultDisplayStyle
}));

const BASE_DEFINITIONS: MutationActionDefinition[] = GENERATED_MANIFEST_DATA.actionDefinitions.map((definition) => ({
  id: definition.id,
  defaultCategory: definition.defaultCategory,
  defaultOrder: definition.defaultOrder,
  defaultVisible: definition.defaultVisible,
  implementationStatus: definition.implementationStatus
}));

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
  return resetCategoryToDefaultOwner(CATEGORY_META, settings, category);
}

export function applyActionPatch(
  settings: AppSettings,
  actionID: string,
  patch: Partial<MenuActionSettings>
): AppSettings {
  return applyActionPatchOwner(settings, actionID, patch);
}

export function resetActionToDefault(settings: AppSettings, actionID: string): AppSettings {
  return resetActionToDefaultOwner(BASE_DEFINITIONS, settings, actionID);
}

export function moveActionInWorkbench(
  settings: AppSettings,
  actionID: string,
  targetCategory: ActionCategory,
  targetIndex: number
): AppSettings {
  return moveActionInWorkbenchOwner(BASE_DEFINITIONS, settings, actionID, targetCategory, targetIndex);
}
