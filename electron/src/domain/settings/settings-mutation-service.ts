import type {
  ActionCategory,
  AppSettings,
  MenuActionSettings,
  MenuCategoryDisplayStyle,
  MenuCategorySettings
} from "../../contracts/contracts";

export type MutationActionImplementationStatus = "implemented" | "beta" | "planned";

export interface MutationActionDefinition {
  id: string;
  defaultCategory: ActionCategory;
  defaultOrder: number;
  defaultVisible?: boolean;
  implementationStatus?: MutationActionImplementationStatus;
}

export interface MutationCategoryDefinition {
  category: ActionCategory;
  defaultOrder: number;
  defaultDisplayStyle: "inline" | "submenu";
}

interface ActionDefaults {
  defaultCategory: ActionCategory;
  defaultOrder: number;
  defaultVisible: boolean;
}

export function applyCategoryReorder(settings: AppSettings, orderedCategories: ActionCategory[]): AppSettings {
  const nextOrder = new Map(orderedCategories.map((category, index) => [category, index * 10]));
  return {
    ...settings,
    contextMenu: {
      ...settings.contextMenu,
      categorySettings: settings.contextMenu.categorySettings.map((item) => ({
        ...item,
        order: nextOrder.get(item.category) ?? item.order
      }))
    }
  };
}

export function applyCategoryPatch(
  settings: AppSettings,
  category: ActionCategory,
  patch: Partial<MenuCategorySettings>
): AppSettings {
  return {
    ...settings,
    contextMenu: {
      ...settings.contextMenu,
      categorySettings: settings.contextMenu.categorySettings.map((item) =>
        item.category === category ? { ...item, ...patch } : item
      )
    }
  };
}

export function resetCategoryToDefault(
  categoryMeta: MutationCategoryDefinition[],
  settings: AppSettings,
  category: ActionCategory
): AppSettings {
  const meta = categoryMeta.find((item) => item.category === category);
  if (!meta) {
    return settings;
  }
  return applyCategoryPatch(settings, category, {
    isEnabled: true,
    order: meta.defaultOrder,
    displayStyle: meta.defaultDisplayStyle as MenuCategoryDisplayStyle
  });
}

export function applyActionPatch(
  settings: AppSettings,
  actionID: string,
  patch: Partial<MenuActionSettings>
): AppSettings {
  return {
    ...settings,
    contextMenu: {
      ...settings.contextMenu,
      actionSettings: settings.contextMenu.actionSettings.map((item) =>
        item.actionID === actionID ? { ...item, ...patch } : item
      )
    }
  };
}

export function resetActionToDefault(
  baseDefinitions: MutationActionDefinition[],
  settings: AppSettings,
  actionID: string
): AppSettings {
  const defaults = buildActionDefaults(baseDefinitions, settings).get(actionID);
  if (!defaults) {
    return settings;
  }
  return applyActionPatch(settings, actionID, {
    isEnabled: defaults.defaultVisible,
    categoryOverride: null,
    orderOverride: null
  });
}

export function moveActionInWorkbench(
  baseDefinitions: MutationActionDefinition[],
  settings: AppSettings,
  actionID: string,
  targetCategory: ActionCategory,
  targetIndex: number
): AppSettings {
  const existing = settings.contextMenu.actionSettings.find((item) => item.actionID === actionID);
  if (!existing) {
    return settings;
  }

  const defaults = buildActionDefaults(baseDefinitions, settings);
  const sourceCategory = resolveCategory(actionID, settings, defaults);
  const affectedCategories = new Set<ActionCategory>([sourceCategory, targetCategory]);
  const orderedBuckets = new Map<ActionCategory, string[]>();

  for (const category of affectedCategories) {
    const ordered = settings.contextMenu.actionSettings
      .filter((item) => item.actionID !== actionID && resolveCategory(item.actionID, settings, defaults) === category)
      .sort((left, right) => resolveOrder(left.actionID, settings, defaults) - resolveOrder(right.actionID, settings, defaults))
      .map((item) => item.actionID);
    orderedBuckets.set(category, ordered);
  }

  const targetBucket = orderedBuckets.get(targetCategory) ?? [];
  const safeIndex = clampIndex(targetIndex, targetBucket.length);
  targetBucket.splice(safeIndex, 0, actionID);
  orderedBuckets.set(targetCategory, targetBucket);

  const updates = new Map<string, Partial<MenuActionSettings>>();
  for (const [category, actionIDs] of orderedBuckets.entries()) {
    actionIDs.forEach((id, index) => {
      const defaultsForAction = defaults.get(id);
      const nextCategoryOverride =
        defaultsForAction && defaultsForAction.defaultCategory === category ? null : category;
      const nextOrder = index * 10;
      const nextOrderOverride =
        defaultsForAction &&
        defaultsForAction.defaultCategory === category &&
        defaultsForAction.defaultOrder === nextOrder
          ? null
          : nextOrder;
      updates.set(id, {
        categoryOverride: nextCategoryOverride,
        orderOverride: nextOrderOverride
      });
    });
  }

  return {
    ...settings,
    contextMenu: {
      ...settings.contextMenu,
      actionSettings: settings.contextMenu.actionSettings.map((item) => {
        const patch = updates.get(item.actionID);
        return patch ? { ...item, ...patch } : item;
      })
    }
  };
}

export function moveSettingsAction(
  baseDefinitions: MutationActionDefinition[],
  settings: AppSettings,
  actionID: string,
  targetCategory: ActionCategory,
  targetIndex: number
): AppSettings {
  const definition = baseDefinitions.find((item) => item.id === actionID);
  if (!definition) {
    return settings;
  }

  const sourceCategory = resolveCategoryFromDefinition(definition, settings);
  const sourceActionIDs = sortedActionIDsForCategory(baseDefinitions, sourceCategory, settings).filter((id) => id !== actionID);
  const targetActionIDs = sourceCategory === targetCategory
    ? sourceActionIDs.slice()
    : sortedActionIDsForCategory(baseDefinitions, targetCategory, settings).filter((id) => id !== actionID);

  targetActionIDs.splice(clampIndex(targetIndex, targetActionIDs.length), 0, actionID);

  const updates = new Map<string, MenuActionSettings>();
  for (const [key, value] of applyOrderedCategoryActionIDs(baseDefinitions, settings, targetCategory, targetActionIDs)) {
    updates.set(key, value);
  }
  if (sourceCategory !== targetCategory) {
    for (const [key, value] of applyOrderedCategoryActionIDs(baseDefinitions, settings, sourceCategory, sourceActionIDs)) {
      updates.set(key, value);
    }
  }

  return withUpdatedActionSettings(settings, updates);
}

export function moveSettingsCategory(
  categoryMeta: MutationCategoryDefinition[],
  settings: AppSettings,
  category: ActionCategory,
  targetIndex: number
): AppSettings {
  const categories = settings.contextMenu.categorySettings
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item) => item.category)
    .filter((currentCategory) => currentCategory !== category);

  categories.splice(clampIndex(targetIndex, categories.length), 0, category);

  const updates = new Map<ActionCategory, MenuCategorySettings>();
  categories.forEach((currentCategory, index) => {
    const previous = categorySettingFor(currentCategory, settings) ?? findDefaultCategorySetting(categoryMeta, currentCategory);
    updates.set(currentCategory, {
      ...previous,
      order: index * 10
    });
  });

  return withUpdatedCategorySettings(settings, updates);
}

export function resetSettingsAction(
  baseDefinitions: MutationActionDefinition[],
  settings: AppSettings,
  actionID: string
): AppSettings {
  const defaultSetting = findDefaultActionSetting(baseDefinitions, actionID);
  return withUpdatedActionSettings(settings, new Map([[actionID, defaultSetting]]));
}

export function resetSettingsCategory(
  categoryMeta: MutationCategoryDefinition[],
  settings: AppSettings,
  category: ActionCategory
): AppSettings {
  const defaultSetting = findDefaultCategorySetting(categoryMeta, category);
  return withUpdatedCategorySettings(settings, new Map([[category, defaultSetting]]));
}

function resolveCategoryFromDefinition(definition: MutationActionDefinition, settings: AppSettings): ActionCategory {
  return actionSettingFor(definition.id, settings)?.categoryOverride ?? definition.defaultCategory;
}

function resolveOrderFromDefinition(definition: MutationActionDefinition, settings: AppSettings): number {
  return actionSettingFor(definition.id, settings)?.orderOverride ?? definition.defaultOrder;
}

function sortedActionIDsForCategory(
  baseDefinitions: MutationActionDefinition[],
  category: ActionCategory,
  settings: AppSettings
): string[] {
  return baseDefinitions
    .filter((definition) => resolveCategoryFromDefinition(definition, settings) === category)
    .sort((left, right) => resolveOrderFromDefinition(left, settings) - resolveOrderFromDefinition(right, settings))
    .map((definition) => definition.id);
}

function applyOrderedCategoryActionIDs(
  baseDefinitions: MutationActionDefinition[],
  settings: AppSettings,
  category: ActionCategory,
  actionIDs: string[]
): Map<string, MenuActionSettings> {
  const definitionByID = new Map(baseDefinitions.map((item) => [item.id, item]));
  const updates = new Map<string, MenuActionSettings>();
  actionIDs.forEach((actionID, index) => {
    const definition = definitionByID.get(actionID);
    if (!definition) {
      return;
    }
    const previous = actionSettingFor(actionID, settings) ?? findDefaultActionSetting(baseDefinitions, actionID);
    const categoryOverride = definition.defaultCategory === category ? null : category;
    const nextOrder = (index + 1) * 10;
    const orderOverride = definition.defaultCategory === category && definition.defaultOrder === nextOrder
      ? null
      : nextOrder;
    updates.set(actionID, {
      ...previous,
      actionID,
      categoryOverride,
      orderOverride
    });
  });
  return updates;
}

function actionSettingFor(actionID: string, settings: AppSettings): MenuActionSettings | undefined {
  return settings.contextMenu.actionSettings.find((item) => item.actionID === actionID);
}

function categorySettingFor(category: ActionCategory, settings: AppSettings): MenuCategorySettings | undefined {
  return settings.contextMenu.categorySettings.find((item) => item.category === category);
}

function withUpdatedActionSettings(settings: AppSettings, updates: Map<string, MenuActionSettings>): AppSettings {
  return {
    ...settings,
    contextMenu: {
      ...settings.contextMenu,
      actionSettings: settings.contextMenu.actionSettings.map((item) => updates.get(item.actionID) ?? item)
    }
  };
}

function withUpdatedCategorySettings(settings: AppSettings, updates: Map<ActionCategory, MenuCategorySettings>): AppSettings {
  return {
    ...settings,
    contextMenu: {
      ...settings.contextMenu,
      categorySettings: settings.contextMenu.categorySettings.map((item) => updates.get(item.category) ?? item)
    }
  };
}

function findDefaultActionSetting(
  baseDefinitions: MutationActionDefinition[],
  actionID: string
): MenuActionSettings {
  const definition = baseDefinitions.find((item) => item.id === actionID);
  if (!definition) {
    return { actionID, isEnabled: true, categoryOverride: null, orderOverride: null };
  }
  return {
    actionID,
    isEnabled: definition.defaultVisible ?? (definition.implementationStatus ?? "implemented") !== "planned",
    categoryOverride: null,
    orderOverride: null
  };
}

function findDefaultCategorySetting(
  categoryMeta: MutationCategoryDefinition[],
  category: ActionCategory
): MenuCategorySettings {
  const meta = categoryMeta.find((item) => item.category === category);
  if (!meta) {
    return { category, isEnabled: true, order: 0, displayStyle: "submenu" };
  }
  return {
    category,
    isEnabled: true,
    order: meta.defaultOrder,
    displayStyle: meta.defaultDisplayStyle
  };
}

function resolveCategory(
  actionID: string,
  settings: AppSettings,
  defaults: Map<string, ActionDefaults>
): ActionCategory {
  const current = actionSettingFor(actionID, settings);
  if (current?.categoryOverride) {
    return current.categoryOverride;
  }
  return defaults.get(actionID)?.defaultCategory ?? "create";
}

function resolveOrder(
  actionID: string,
  settings: AppSettings,
  defaults: Map<string, ActionDefaults>
): number {
  const current = actionSettingFor(actionID, settings);
  if (typeof current?.orderOverride === "number") {
    return current.orderOverride;
  }
  return defaults.get(actionID)?.defaultOrder ?? 0;
}

function buildActionDefaults(
  baseDefinitions: MutationActionDefinition[],
  settings: AppSettings
): Map<string, ActionDefaults> {
  const defaults = new Map<string, ActionDefaults>();

  baseDefinitions.forEach((definition) => {
    defaults.set(definition.id, {
      defaultCategory: definition.defaultCategory,
      defaultOrder: definition.defaultOrder,
      defaultVisible: definition.defaultVisible ?? (definition.implementationStatus ?? "implemented") !== "planned"
    });
  });

  settings.customActions.openActions
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .forEach((item, index) => {
      defaults.set(`open.custom.${item.id}`, {
        defaultCategory: item.category,
        defaultOrder: 1000 + index,
        defaultVisible: true
      });
    });

  settings.contextMenu.actionSettings.forEach((item, index) => {
    if (defaults.has(item.actionID)) {
      return;
    }
    if (item.actionID.startsWith("create.template.")) {
      defaults.set(item.actionID, {
        defaultCategory: "create",
        defaultOrder: 1000 + index,
        defaultVisible: true
      });
      return;
    }
    if (item.actionID.startsWith("script.run.")) {
      defaults.set(item.actionID, {
        defaultCategory: "scripts",
        defaultOrder: 1000 + index,
        defaultVisible: true
      });
      return;
    }
    defaults.set(item.actionID, {
      defaultCategory: item.categoryOverride ?? "create",
      defaultOrder: item.orderOverride ?? 1000 + index,
      defaultVisible: item.isEnabled
    });
  });

  return defaults;
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length));
}
