import type {
  ActionCategory,
  AppSettings,
  FinderActionContext,
  MenuActionSettings,
  MenuCategorySettings,
  SelectionKind,
  ToolKind
} from "../../contracts/contracts";
import { evaluateActionAvailability } from "./action-availability";
import { getRuntimeTemplateDefinitions } from "./runtime-template-definitions";

export type ActionImplementationStatus = "implemented" | "beta" | "planned";

export interface ProjectionActionDefinition {
  id: string;
  title: string;
  systemImageName: string;
  defaultCategory: ActionCategory;
  supportedContexts: SelectionKind[];
  implementationStatus?: ActionImplementationStatus;
  defaultOrder: number;
  defaultVisible?: boolean;
  childrenPolicy?: "none" | "builtInTemplates" | "scripts";
  requiredTool?: ToolKind;
  requiresAI?: boolean;
  requiresWritableTarget?: boolean;
  requiresSingleSelection?: boolean;
  requiresDirectoryContext?: boolean;
}

export interface ProjectionCategoryDefinition {
  category: ActionCategory;
  title: string;
  systemImageName: string;
  defaultOrder: number;
  defaultDisplayStyle: "inline" | "submenu";
}

export interface ProjectionPreviewActionDescriptor {
  id: string;
  title: string;
  category: ActionCategory;
  isEnabled: boolean;
  statusBadge?: string;
  children: ProjectionPreviewActionDescriptor[];
}

export interface ProjectionSettingsActionInspectorItem {
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

export interface ProjectionSettingsCategoryWorkbenchItem {
  category: ActionCategory;
  title: string;
  order: number;
  isEnabled: boolean;
  displayStyle: "inline" | "submenu";
  actionCount: number;
  visibleActionCount: number;
}

export interface ProjectionSettingsCategoryInspectorItem {
  category: ActionCategory;
  title: string;
  systemImageName: string;
  isEnabled: boolean;
  order: number;
  displayStyle: "inline" | "submenu";
  actions: ProjectionSettingsActionInspectorItem[];
}

export function actionSettingFor(actionID: string, settings: AppSettings): MenuActionSettings | undefined {
  return settings.contextMenu.actionSettings.find((item) => item.actionID === actionID);
}

export function categorySettingFor(category: ActionCategory, settings: AppSettings): MenuCategorySettings | undefined {
  return settings.contextMenu.categorySettings.find((item) => item.category === category);
}

export function resolveCategory(definition: ProjectionActionDefinition, settings: AppSettings): ActionCategory {
  return actionSettingFor(definition.id, settings)?.categoryOverride ?? definition.defaultCategory;
}

export function resolveOrder(definition: ProjectionActionDefinition, settings: AppSettings): number {
  return actionSettingFor(definition.id, settings)?.orderOverride ?? definition.defaultOrder;
}

export function buildDynamicOpenActionDefinitions(settings: AppSettings): ProjectionActionDefinition[] {
  return (settings.customActions?.openActions ?? [])
    .filter((item) => item.isEnabled)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item, index) => ({
      id: `open.custom.${item.id}`,
      title: item.name,
      systemImageName: "app.badge",
      defaultCategory: item.category,
      supportedContexts:
        item.targetKind === "file" ? ["file", "mixed", "multi"] :
        item.targetKind === "folder" ? ["folder", "empty", "mixed", "multi"] :
        ["file", "folder", "mixed", "empty", "multi"],
      defaultOrder: 1000 + index,
      defaultVisible: true
    }));
}

export function getContextMenuDefinitions(
  baseDefinitions: ProjectionActionDefinition[],
  settings: AppSettings
): ProjectionActionDefinition[] {
  return [...baseDefinitions, ...buildDynamicOpenActionDefinitions(settings)];
}

function hasWorkingDirectory(context: FinderActionContext): boolean {
  if (context.resolvedTargetDirectory || context.resolvedSelectionDirectory) {
    return true;
  }
  if (typeof context.capabilities?.hasWorkingDirectory === "boolean") {
    return context.capabilities.hasWorkingDirectory;
  }
  if (context.currentDirectoryURL) {
    return true;
  }
  if (context.selectionKind === "folder" && context.primaryURL) {
    return true;
  }
  if (context.selectionKind === "file" && context.primaryURL) {
    return true;
  }
  return false;
}

function currentTargetDirectory(context: FinderActionContext): string | null {
  return context.resolvedTargetDirectory ?? context.resolvedSelectionDirectory ?? context.currentDirectoryURL ?? null;
}

function currentTargetLabel(definition: ProjectionActionDefinition, context: FinderActionContext): string {
  const directoryTarget = currentTargetDirectory(context);
  const primaryTarget = context.resolvedPrimaryTarget ?? context.primaryURL ?? null;

  if (definition.id.startsWith("create.") || definition.id === "submenu.templates" || definition.id === "git.status" || definition.id.startsWith("view.")) {
    return directoryTarget ?? "No resolved target";
  }
  if (definition.id.startsWith("copy.") || definition.id === "finder.reveal" || definition.id.startsWith("open.") || definition.id.startsWith("file.")) {
    return primaryTarget ?? directoryTarget ?? "No resolved target";
  }
  return primaryTarget ?? directoryTarget ?? "No resolved target";
}

function templateChildren(context: FinderActionContext, settings: AppSettings): ProjectionPreviewActionDescriptor[] {
  const output: ProjectionPreviewActionDescriptor[] = [];
  for (const [index, template] of getRuntimeTemplateDefinitions(settings).entries()) {
    const definition: ProjectionActionDefinition = {
      id: `create.template.${template.id}`,
      title: template.title,
      systemImageName: "doc.badge.plus",
      defaultCategory: "create",
      supportedContexts: ["file", "folder", "empty"],
      defaultOrder: 1000 + index,
      requiresWritableTarget: true,
      requiresDirectoryContext: true
    };
    const availability = evaluateActionAvailability(definition, context, settings);
    if (!availability.isVisible && !settings.contextMenu.showUnavailableInPreview) {
      continue;
    }
    output.push({
      id: definition.id,
      title: template.title,
      category: "create",
      isEnabled: availability.isEnabled,
      statusBadge: availability.isEnabled ? undefined : availability.disabledReason,
      children: []
    });
  }
  return output;
}

function scriptChildren(context: FinderActionContext): ProjectionPreviewActionDescriptor[] {
  const scriptNames = context.capabilities?.scriptNames ?? [];
  if (scriptNames.length === 0) {
    return [];
  }
  return scriptNames.map((name) => ({
    id: `script.run.${name}`,
    title: name.replace(/\.[^.]+$/, ""),
    category: "scripts",
    isEnabled: hasWorkingDirectory(context),
    statusBadge: hasWorkingDirectory(context) ? undefined : "缺少工作目录",
    children: []
  }));
}

function placementPathForAction(
  descriptors: ProjectionPreviewActionDescriptor[],
  actionID: string,
  trail: string[] = []
): string[] | null {
  for (const descriptor of descriptors) {
    if (descriptor.id === actionID) {
      return trail;
    }
    if (descriptor.children.length > 0) {
      const nextTrail = descriptor.id.startsWith("category.") ? [...trail, descriptor.title] : trail;
      const found = placementPathForAction(descriptor.children, actionID, nextTrail);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function buildPreviewDescriptors(
  baseDefinitions: ProjectionActionDefinition[],
  categoryMeta: ProjectionCategoryDefinition[],
  context: FinderActionContext,
  settings: AppSettings
): ProjectionPreviewActionDescriptor[] {
  const categories = categoryMeta.slice().sort((left, right) => {
    const leftOrder = categorySettingFor(left.category, settings)?.order ?? left.defaultOrder;
    const rightOrder = categorySettingFor(right.category, settings)?.order ?? right.defaultOrder;
    return leftOrder - rightOrder;
  });

  const output: ProjectionPreviewActionDescriptor[] = [];
  for (const category of categories) {
    if (!(categorySettingFor(category.category, settings)?.isEnabled ?? true)) {
      continue;
    }

    const actions: ProjectionPreviewActionDescriptor[] = getContextMenuDefinitions(baseDefinitions, settings)
      .filter((definition) => resolveCategory(definition, settings) === category.category)
      .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
      .reduce<ProjectionPreviewActionDescriptor[]>((items, definition) => {
        const availability = evaluateActionAvailability(definition, context, settings);
        if (!availability.isVisible && !settings.contextMenu.showUnavailableInPreview) {
          return items;
        }
        const children =
          definition.childrenPolicy === "builtInTemplates" ? templateChildren(context, settings) :
          definition.childrenPolicy === "scripts" ? scriptChildren(context) :
          [];
        if (definition.childrenPolicy && definition.childrenPolicy !== "none" && children.length === 0) {
          return items;
        }
        items.push({
          id: definition.id,
          title: definition.title,
          category: category.category,
          isEnabled: availability.isEnabled,
          statusBadge: availability.isEnabled ? undefined : availability.disabledReason,
          children
        });
        return items;
      }, []);

    if (actions.length === 0) {
      continue;
    }

    const displayStyle = categorySettingFor(category.category, settings)?.displayStyle ?? category.defaultDisplayStyle;
    if (displayStyle === "inline" || (settings.contextMenu.collapseSingleActionGroups && actions.length === 1)) {
      output.push(...actions);
      continue;
    }
    output.push({
      id: `category.${category.category}`,
      title: category.title,
      category: category.category,
      isEnabled: true,
      children: actions
    });
  }

  return output;
}

export function describeActionPlacement(
  baseDefinitions: ProjectionActionDefinition[],
  categoryMeta: ProjectionCategoryDefinition[],
  actionID: string,
  context: FinderActionContext,
  settings: AppSettings
): string {
  const previewTree = buildPreviewDescriptors(baseDefinitions, categoryMeta, context, settings);
  const placementTrail = placementPathForAction(previewTree, actionID);
  if (placementTrail == null) {
    return "Not included in last actual Finder menu";
  }
  if (placementTrail.length === 0) {
    return "Top level";
  }
  return `${placementTrail.join(" › ")} submenu`;
}

export function buildSettingsActionInspectorItems(
  baseDefinitions: ProjectionActionDefinition[],
  categoryMeta: ProjectionCategoryDefinition[],
  category: ActionCategory,
  context: FinderActionContext,
  settings: AppSettings
): ProjectionSettingsActionInspectorItem[] {
  const previewTree = buildPreviewDescriptors(baseDefinitions, categoryMeta, context, settings);
  return getContextMenuDefinitions(baseDefinitions, settings)
    .filter((definition) => resolveCategory(definition, settings) === category)
    .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
    .map<ProjectionSettingsActionInspectorItem>((definition) => {
      const availability = evaluateActionAvailability(definition, context, settings);
      const placementTrail = placementPathForAction(previewTree, definition.id);
      return {
        actionID: definition.id,
        title: definition.title,
        category,
        implementationStatus: definition.implementationStatus ?? "implemented",
        supportedContexts: definition.supportedContexts,
        settingEnabled: actionSettingFor(definition.id, settings)?.isEnabled ?? (definition.defaultVisible ?? true),
        appearsInCurrentContext: availability.isVisible,
        placementLabel: placementTrail == null ? "Not included in last actual Finder menu" : (placementTrail.length === 0 ? "Top level" : `${placementTrail.join(" › ")} submenu`),
        resolvedTargetLabel: currentTargetLabel(definition, context),
        currentReason: availability.isVisible ? undefined : availability.disabledReason
      };
    });
}

export function buildSettingsCategoryWorkbenchItems(
  baseDefinitions: ProjectionActionDefinition[],
  categoryMeta: ProjectionCategoryDefinition[],
  context: FinderActionContext,
  settings: AppSettings
): ProjectionSettingsCategoryWorkbenchItem[] {
  return categoryMeta
    .map<ProjectionSettingsCategoryWorkbenchItem>((meta) => {
      const definitions = getContextMenuDefinitions(baseDefinitions, settings)
        .filter((definition) => resolveCategory(definition, settings) === meta.category)
        .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings));
      const visibleActionCount = definitions.filter((definition) => evaluateActionAvailability(definition, context, settings).isVisible).length;
      const categorySetting = categorySettingFor(meta.category, settings);
      return {
        category: meta.category,
        title: meta.title,
        order: categorySetting?.order ?? meta.defaultOrder,
        isEnabled: categorySetting?.isEnabled ?? true,
        displayStyle: categorySetting?.displayStyle ?? meta.defaultDisplayStyle,
        actionCount: definitions.length,
        visibleActionCount
      };
    })
    .sort((left, right) => left.order - right.order);
}

export function buildSettingsCategoryInspectorItems(
  baseDefinitions: ProjectionActionDefinition[],
  categoryMeta: ProjectionCategoryDefinition[],
  context: FinderActionContext,
  settings: AppSettings
): ProjectionSettingsCategoryInspectorItem[] {
  return categoryMeta
    .slice()
    .sort((left, right) => {
      const leftOrder = categorySettingFor(left.category, settings)?.order ?? left.defaultOrder;
      const rightOrder = categorySettingFor(right.category, settings)?.order ?? right.defaultOrder;
      return leftOrder - rightOrder;
    })
    .map<ProjectionSettingsCategoryInspectorItem>((category) => ({
      category: category.category,
      title: category.title,
      systemImageName: category.systemImageName,
      isEnabled: categorySettingFor(category.category, settings)?.isEnabled ?? true,
      order: categorySettingFor(category.category, settings)?.order ?? category.defaultOrder,
      displayStyle: categorySettingFor(category.category, settings)?.displayStyle ?? category.defaultDisplayStyle,
      actions: buildSettingsActionInspectorItems(baseDefinitions, categoryMeta, category.category, context, settings)
    }));
}
