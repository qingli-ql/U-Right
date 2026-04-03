import type {
  AppSettings,
  ActionCategory,
  FinderActionContext,
  MenuActionSettings,
  MenuCategorySettings,
  SelectionKind,
  ToolAvailability,
  ToolKind,
  UserTemplateItem
} from "./contracts";
import { getAIActionVisibility, getActiveAIProfile, getIntegrationSettings, getTemplateSettings } from "./resolved-settings";

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

const ALL_SELECTION_KINDS: SelectionKind[] = ["file", "folder", "mixed", "empty", "multi"];

export const ACTION_CATEGORY_META: MenuCategoryDefinition[] = [
  { category: "create", title: "Create", systemImageName: "plus.square.on.square", defaultOrder: 0, defaultDisplayStyle: "submenu" },
  { category: "open", title: "Open", systemImageName: "square.and.arrow.up", defaultOrder: 10, defaultDisplayStyle: "submenu" },
  { category: "clipboard", title: "Clipboard", systemImageName: "document.on.document", defaultOrder: 20, defaultDisplayStyle: "submenu" },
  { category: "fileOps", title: "File", systemImageName: "folder", defaultOrder: 30, defaultDisplayStyle: "submenu" },
  { category: "view", title: "View", systemImageName: "eye", defaultOrder: 40, defaultDisplayStyle: "submenu" },
  { category: "ai", title: "AI", systemImageName: "sparkles", defaultOrder: 50, defaultDisplayStyle: "submenu" },
  { category: "git", title: "Git", systemImageName: "point.topleft.down.curvedto.point.bottomright.up", defaultOrder: 60, defaultDisplayStyle: "submenu" },
  { category: "scripts", title: "Scripts", systemImageName: "terminal", defaultOrder: 70, defaultDisplayStyle: "submenu" }
];

export const BUILT_IN_TEMPLATE_TITLES: Record<string, string> = {
  empty: "Empty File...",
  text: "Text File",
  markdown: "Markdown File",
  json: "JSON File",
  python: "Python File",
  shell: "Shell Script",
  html: "HTML File",
  css: "CSS File",
  javascript: "JavaScript File",
  typescript: "TypeScript File",
  readme: "README.md",
  gitignore: ".gitignore",
  env: ".env"
};

export interface RuntimeTemplateDefinition {
  id: string;
  title: string;
  fileNameSuggestion: string;
  fileExtension: string;
  starterContent: string;
  makeExecutable?: boolean;
  source: "builtin" | "user";
}

export const DEFAULT_VISIBLE_AI_ACTION_IDS = ["ai.ask-claude", "ai.ask-codex"];

export const PROMOTED_ACTION_VISIBILITY_GROUPS = [
  ["copy.filename", "copy.basename", "copy.extension"],
  ["view.toggle-hidden", "view.refresh"]
] as const;

export const ACTION_DEFINITIONS: ActionDefinition[] = [
  { id: "create.new-file", title: "New File...", systemImageName: "plus.square.on.square", defaultCategory: "create", supportedContexts: ["file", "folder", "empty"], defaultOrder: 0, requiresWritableTarget: true, requiresDirectoryContext: true },
  { id: "create.new-folder", title: "New Folder", systemImageName: "folder.badge.plus", defaultCategory: "create", supportedContexts: ["file", "folder", "empty"], defaultOrder: 10, requiresWritableTarget: true, requiresDirectoryContext: true },
  { id: "submenu.templates", title: "New From Template", systemImageName: "doc.badge.plus", defaultCategory: "create", supportedContexts: ["file", "folder", "empty"], defaultOrder: 20, requiresWritableTarget: true, requiresDirectoryContext: true, childrenPolicy: "builtInTemplates" },
  { id: "open.terminal", title: "Open in Terminal", systemImageName: "terminal", defaultCategory: "open", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 0, requiredTool: "terminal" },
  { id: "open.vscode", title: "Open in VS Code", systemImageName: "chevron.left.forwardslash.chevron.right", defaultCategory: "open", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 10, requiredTool: "vscode" },
  { id: "open.cursor", title: "Open in Cursor", systemImageName: "cursorarrow.rays", defaultCategory: "open", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 20, requiredTool: "cursor" },
  { id: "open.zed", title: "Open in Zed", systemImageName: "bolt.badge.a", defaultCategory: "open", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 30, requiredTool: "zed" },
  { id: "open.ghostty", title: "Open in Ghostty", systemImageName: "terminal", defaultCategory: "open", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 40, requiredTool: "ghostty" },
  { id: "copy.path", title: "Copy Path", systemImageName: "document.on.document", defaultCategory: "clipboard", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 0 },
  { id: "copy.relative-path", title: "Copy Relative Path", systemImageName: "arrowshape.turn.up.backward.2", defaultCategory: "clipboard", supportedContexts: ["file", "folder", "multi"], defaultOrder: 10, implementationStatus: "beta" },
  { id: "copy.filename", title: "Copy Filename", systemImageName: "textformat.characters", defaultCategory: "clipboard", supportedContexts: ["file"], defaultOrder: 20, implementationStatus: "implemented", defaultVisible: true },
  { id: "copy.basename", title: "Copy Basename", systemImageName: "character.textbox", defaultCategory: "clipboard", supportedContexts: ["file"], defaultOrder: 30, implementationStatus: "implemented", defaultVisible: true },
  { id: "copy.extension", title: "Copy Extension", systemImageName: "tag", defaultCategory: "clipboard", supportedContexts: ["file"], defaultOrder: 40, implementationStatus: "implemented", defaultVisible: true },
  { id: "finder.reveal", title: "Reveal in Finder", systemImageName: "finder", defaultCategory: "view", supportedContexts: ["file", "folder", "multi"], defaultOrder: 0 },
  { id: "file.rename", title: "Rename", systemImageName: "pencil", defaultCategory: "fileOps", supportedContexts: ["file", "folder"], defaultOrder: 0, requiresWritableTarget: true, requiresSingleSelection: true, needsConfirmation: true },
  { id: "file.trash", title: "Move to Trash", systemImageName: "trash", defaultCategory: "fileOps", supportedContexts: ["file", "folder", "multi"], defaultOrder: 10, requiresWritableTarget: true, isDestructive: true, needsConfirmation: true },
  { id: "file.duplicate", title: "Duplicate", systemImageName: "plus.square.on.square", defaultCategory: "fileOps", supportedContexts: ["file", "folder", "multi"], defaultOrder: 20, implementationStatus: "beta", requiresWritableTarget: true },
  { id: "file.compress", title: "Compress", systemImageName: "archivebox", defaultCategory: "fileOps", supportedContexts: ["file", "folder", "multi"], defaultOrder: 30, implementationStatus: "beta", requiresWritableTarget: true },
  { id: "file.json-format", title: "JSON Format", systemImageName: "curlybraces", defaultCategory: "fileOps", supportedContexts: ["file"], defaultOrder: 40, implementationStatus: "beta", requiresWritableTarget: true, requiresSingleSelection: true, needsConfirmation: true },
  { id: "file.toggle-executable", title: "Toggle Executable Bit", systemImageName: "switch.2", defaultCategory: "fileOps", supportedContexts: ["file"], defaultOrder: 50, implementationStatus: "beta", requiresWritableTarget: true, requiresSingleSelection: true, needsConfirmation: true },
  { id: "git.status", title: "Open Git Status Here", systemImageName: "point.topleft.down.curvedto.point.bottomright.up", defaultCategory: "git", supportedContexts: ["file", "folder", "empty"], defaultOrder: 0, implementationStatus: "beta", requiresDirectoryContext: true },
  { id: "ai.ask-claude", title: "Ask Claude About This", systemImageName: "sparkles", defaultCategory: "ai", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 0, requiresAI: true },
  { id: "ai.ask-codex", title: "Ask Codex About This", systemImageName: "brain", defaultCategory: "ai", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 10, requiresAI: true },
  { id: "ai.explain-project", title: "Explain This Project", systemImageName: "folder.badge.questionmark", defaultCategory: "ai", supportedContexts: ["folder", "empty", "multi"], defaultOrder: 20, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.summarize-files", title: "Summarize Files", systemImageName: "doc.text.magnifyingglass", defaultCategory: "ai", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 30, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.generate-readme", title: "Generate README", systemImageName: "book.pages", defaultCategory: "ai", supportedContexts: ["folder", "empty", "multi"], defaultOrder: 40, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.generate-gitignore", title: "Generate .gitignore", systemImageName: "nosign", defaultCategory: "ai", supportedContexts: ["folder", "empty"], defaultOrder: 50, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.review-code", title: "Review Code", systemImageName: "checkmark.seal.text.page", defaultCategory: "ai", supportedContexts: ["file", "folder", "multi"], defaultOrder: 60, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.refactor-file", title: "Refactor This File", systemImageName: "wand.and.stars", defaultCategory: "ai", supportedContexts: ["file"], defaultOrder: 70, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.write-tests", title: "Write Tests For This", systemImageName: "testtube.2", defaultCategory: "ai", supportedContexts: ["file", "folder"], defaultOrder: 80, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.explain-error", title: "Explain Error Log", systemImageName: "exclamationmark.bubble", defaultCategory: "ai", supportedContexts: ["file"], defaultOrder: 90, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.json-schema", title: "Convert to JSON Schema", systemImageName: "curlybraces.square", defaultCategory: "ai", supportedContexts: ["file"], defaultOrder: 100, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.commit-message", title: "Draft Commit Message", systemImageName: "text.redaction", defaultCategory: "ai", supportedContexts: ["folder", "empty", "multi"], defaultOrder: 110, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.pr-summary", title: "Draft PR Summary", systemImageName: "rectangle.and.pencil.and.ellipsis", defaultCategory: "ai", supportedContexts: ["folder", "empty", "multi"], defaultOrder: 120, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.summarize-selection", title: "AI Summarize Selection", systemImageName: "sparkles.rectangle.stack", defaultCategory: "ai", supportedContexts: ["multi"], defaultOrder: 130, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.ask-selection", title: "AI Ask About Selection", systemImageName: "questionmark.bubble", defaultCategory: "ai", supportedContexts: ["multi"], defaultOrder: 140, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "ai.repeat-last", title: "Repeat Last AI Action", systemImageName: "arrow.clockwise.circle", defaultCategory: "ai", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 150, implementationStatus: "planned", defaultVisible: false, requiresAI: true },
  { id: "submenu.scripts", title: "Scripts", systemImageName: "terminal", defaultCategory: "scripts", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 0, implementationStatus: "beta", childrenPolicy: "scripts" },
  { id: "view.toggle-hidden", title: "Show Hidden Files Here", systemImageName: "eye.slash", defaultCategory: "view", supportedContexts: ["file", "folder", "empty"], defaultOrder: 10, implementationStatus: "beta", requiresDirectoryContext: true },
  { id: "view.refresh", title: "Refresh Finder Window", systemImageName: "arrow.clockwise", defaultCategory: "view", supportedContexts: ALL_SELECTION_KINDS, defaultOrder: 20, implementationStatus: "beta" },
  { id: "folder.search", title: "Search in Folder", systemImageName: "magnifyingglass", defaultCategory: "view", supportedContexts: ["folder", "empty"], defaultOrder: 30, implementationStatus: "planned", defaultVisible: false },
  { id: "folder.size", title: "Folder Size", systemImageName: "internaldrive", defaultCategory: "view", supportedContexts: ["folder", "empty"], defaultOrder: 40, implementationStatus: "planned", defaultVisible: false },
  { id: "folder.count", title: "Count Items", systemImageName: "number", defaultCategory: "view", supportedContexts: ["folder", "empty"], defaultOrder: 50, implementationStatus: "planned", defaultVisible: false },
  { id: "multi.batch-rename", title: "Batch Rename", systemImageName: "character.cursor.ibeam", defaultCategory: "fileOps", supportedContexts: ["multi"], defaultOrder: 60, implementationStatus: "planned", defaultVisible: false }
];

export const TOOL_ORDER: ToolKind[] = [
  "terminal",
  "ghostty",
  "iTerm",
  "vscode",
  "cursor",
  "zed",
  "claude",
  "codex",
  "gh",
  "lazygit",
  "gitup"
];

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

export function getUserTemplates(settings: AppSettings): UserTemplateItem[] {
  return getTemplateSettings(settings).userTemplates ?? [];
}

export function getRuntimeTemplateDefinitions(settings: AppSettings): RuntimeTemplateDefinition[] {
  const hiddenBuiltInTemplateIDs = new Set(getTemplateSettings(settings).hiddenBuiltInTemplateIDs ?? []);
  const builtins: RuntimeTemplateDefinition[] = Object.entries(BUILT_IN_TEMPLATE_TITLES)
    .filter(([id]) => !hiddenBuiltInTemplateIDs.has(id))
    .map(([id, title]) => ({
    id,
    title,
    fileNameSuggestion:
      id === "markdown" ? "README" :
      id === "readme" ? "README" :
      id === "gitignore" ? ".gitignore" :
      id === "env" ? ".env" :
      id === "text" ? "notes" :
      id === "json" ? "data" :
      id === "python" ? "main" :
      id === "shell" ? "script" :
      id === "html" ? "index" :
      id === "css" ? "styles" :
      id === "javascript" ? "app" :
      id === "typescript" ? "app" :
      "untitled",
    fileExtension:
      id === "markdown" || id === "readme" ? "md" :
      id === "text" ? "txt" :
      id === "json" ? "json" :
      id === "python" ? "py" :
      id === "shell" ? "sh" :
      id === "html" ? "html" :
      id === "css" ? "css" :
      id === "javascript" ? "js" :
      id === "typescript" ? "ts" :
      "",
    starterContent:
      id === "markdown" ? "# Title\n\n" :
      id === "json" ? "{\n  \"name\": \"value\"\n}\n" :
      id === "python" ? "#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\n\ndef main() -> None:\n    print(\"Hello from U-Right\")\n\n\nif __name__ == \"__main__\":\n    main()\n" :
      id === "shell" ? "#!/bin/bash\nset -euo pipefail\n\n" :
      id === "html" ? "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <title>U-Right</title>\n</head>\n<body>\n</body>\n</html>\n" :
      id === "css" ? ":root {\n  color-scheme: light dark;\n}\n" :
      id === "javascript" ? "console.log('Hello from U-Right');\n" :
      id === "typescript" ? "export function main(): void {\n  console.log('Hello from U-Right');\n}\n\nmain();\n" :
      id === "readme" ? "# Project\n\n## Overview\n\n" :
      id === "gitignore" ? ".DS_Store\nnode_modules/\n.build/\nDerivedData/\n" :
      id === "env" ? "# Environment variables\n" :
      "",
    makeExecutable: id === "python" || id === "shell",
    source: "builtin"
  }));

  const users = getUserTemplates(settings)
    .filter((item) => item.isEnabled)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map<RuntimeTemplateDefinition>((item) => ({
      id: `user.${item.id}`,
      title: item.name,
      fileNameSuggestion: item.defaultFileName,
      fileExtension: item.fileExtension,
      starterContent: item.starterContent,
      makeExecutable: item.makeExecutable,
      source: "user"
    }));

  return [...builtins, ...users];
}

function getDynamicActionDefinitions(settings: AppSettings): ActionDefinition[] {
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
        ALL_SELECTION_KINDS,
      defaultOrder: 1000 + index,
      defaultVisible: true
    }));
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
  return settings.contextMenu.actionSettings.find((item) => item.actionID === actionID);
}

export function categorySettingFor(category: ActionCategory, settings: AppSettings) {
  return settings.contextMenu.categorySettings.find((item) => item.category === category);
}

export function resolveCategory(definition: ActionDefinition, settings: AppSettings): ActionCategory {
  return actionSettingFor(definition.id, settings)?.categoryOverride ?? definition.defaultCategory;
}

export function resolveOrder(definition: ActionDefinition, settings: AppSettings): number {
  return actionSettingFor(definition.id, settings)?.orderOverride ?? definition.defaultOrder;
}

function hasWorkingDirectory(context: FinderActionContext) {
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

function hasWritableTarget(context: FinderActionContext) {
  if (typeof context.capabilities?.hasWritableTarget === "boolean") {
    return context.capabilities.hasWritableTarget;
  }
  return context.selectionKind === "file" || context.selectionKind === "folder" || context.selectionKind === "empty" || context.selectionKind === "multi";
}

function currentTargetDirectory(context: FinderActionContext): string | null {
  return context.resolvedTargetDirectory ?? context.resolvedSelectionDirectory ?? context.currentDirectoryURL ?? null;
}

function currentTargetLabel(definition: ActionDefinition, context: FinderActionContext): string {
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

function formatDisabledReason(definition: ActionDefinition, reason: string | undefined) {
  if (!reason) {
    return reason;
  }
  if (reason === "当前上下文不支持") {
    if (definition.id === "create.new-file" || definition.id === "create.new-folder" || definition.id === "submenu.templates" || definition.id.startsWith("create.template.")) {
      return "仅在可解析目录目标的单选上下文中显示";
    }
  }
  if (reason === "缺少目录上下文") {
    if (definition.id === "create.new-file" || definition.id === "create.new-folder" || definition.id === "submenu.templates" || definition.id.startsWith("create.template.")) {
      return "缺少可创建内容的目标目录";
    }
    if (definition.id === "git.status") {
      return "缺少可打开 Git 状态的目标目录";
    }
    if (definition.id.startsWith("view.")) {
      return "缺少可作用的 Finder 目录";
    }
  }
  return reason;
}

function hasAvailableAIBackend(context: FinderActionContext, settings: AppSettings, definition: ActionDefinition) {
  const hasAPI = Boolean(getActiveAIProfile(settings)?.apiKey);
  if (definition.id === "ai.ask-claude") {
    return context.detectedTools.claude?.isInstalled === true || hasAPI;
  }
  if (definition.id === "ai.ask-codex") {
    return context.detectedTools.codex?.isInstalled === true || hasAPI;
  }
  return context.detectedTools.claude?.isInstalled === true || context.detectedTools.codex?.isInstalled === true || hasAPI;
}

export function evaluateActionAvailability(definition: ActionDefinition, context: FinderActionContext, settings: AppSettings): ActionAvailability {
  if ((definition.implementationStatus ?? "implemented") === "planned") {
    return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "未实现") };
  }
  if (!definition.supportedContexts.includes(context.selectionKind)) {
    return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "当前上下文不支持") };
  }
  if (!(actionSettingFor(definition.id, settings)?.isEnabled ?? (definition.defaultVisible ?? true))) {
    return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "已在设置中隐藏") };
  }
  if (!(categorySettingFor(resolveCategory(definition, settings), settings)?.isEnabled ?? true)) {
    return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "分类已隐藏") };
  }
  if (definition.requiresSingleSelection && context.selectedURLs.length > 1) {
    return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "仅支持单个目标") };
  }
  if (definition.requiresDirectoryContext && !hasWorkingDirectory(context)) {
    return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "缺少目录上下文") };
  }
  if (definition.requiresWritableTarget && !hasWritableTarget(context)) {
    return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "目标不可写") };
  }
  if (definition.requiresAI) {
    if (!settings.ai.enabled) {
      return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "AI 已禁用") };
    }
    if (!getAIActionVisibility(settings).includes(definition.id)) {
      return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "AI 动作未启用") };
    }
    if (!hasAvailableAIBackend(context, settings, definition)) {
      return { isVisible: settings.contextMenu.showUnavailableInPreview, isEnabled: false, disabledReason: formatDisabledReason(definition, "未检测到可用 AI") };
    }
  }
  if (definition.requiredTool) {
    const preference = getIntegrationSettings(settings).toolPreferences.find((item) => item.kind === definition.requiredTool);
    if (!(preference?.allowMenuActions ?? true)) {
      return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "工具动作已禁用") };
    }
    if (!(context.detectedTools[definition.requiredTool]?.isInstalled === true)) {
      return { isVisible: settings.contextMenu.showUnavailableInPreview, isEnabled: false, disabledReason: formatDisabledReason(definition, `未检测到 ${definition.requiredTool}`) };
    }
  }
  return { isVisible: true, isEnabled: true };
}

function placementPathForAction(
  descriptors: PreviewActionDescriptor[],
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

export function describeActionPlacement(
  actionID: string,
  context: FinderActionContext,
  settings: AppSettings
): string {
  const previewTree = buildPreviewDescriptors(context, settings);
  const placementTrail = placementPathForAction(previewTree, actionID);
  if (placementTrail == null) {
    return "Not included in last actual Finder menu";
  }
  if (placementTrail.length === 0) {
    return "Top level";
  }
  return `${placementTrail.join(" › ")} submenu`;
}

function templateChildren(context: FinderActionContext, settings: AppSettings): PreviewActionDescriptor[] {
  const output: PreviewActionDescriptor[] = [];
  for (const [index, template] of getRuntimeTemplateDefinitions(settings).entries()) {
    const definition: ActionDefinition = {
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

function scriptChildren(context: FinderActionContext): PreviewActionDescriptor[] {
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

export function buildPreviewDescriptors(context: FinderActionContext, settings: AppSettings): PreviewActionDescriptor[] {
  const categories = ACTION_CATEGORY_META.slice().sort((left, right) => {
    const leftOrder = categorySettingFor(left.category, settings)?.order ?? left.defaultOrder;
    const rightOrder = categorySettingFor(right.category, settings)?.order ?? right.defaultOrder;
    return leftOrder - rightOrder;
  });

  const output: PreviewActionDescriptor[] = [];

  for (const category of categories) {
    if (!(categorySettingFor(category.category, settings)?.isEnabled ?? true)) {
      continue;
    }

    const actions: PreviewActionDescriptor[] = [...ACTION_DEFINITIONS, ...getDynamicActionDefinitions(settings)]
      .filter((definition) => resolveCategory(definition, settings) === category.category)
      .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
      .reduce<PreviewActionDescriptor[]>((items, definition) => {
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
    } else {
      output.push({
        id: `category.${category.category}`,
        title: category.title,
        category: category.category,
        isEnabled: true,
        children: actions
      });
    }
  }

  return output;
}

export function buildSettingsActionInspectorItems(category: ActionCategory, context: FinderActionContext, settings: AppSettings): SettingsActionInspectorItem[] {
  const previewTree = buildPreviewDescriptors(context, settings);
  return getContextMenuDefinitions(settings)
    .filter((definition) => resolveCategory(definition, settings) === category)
    .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
    .map<SettingsActionInspectorItem>((definition) => {
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

export function buildSettingsCategoryWorkbenchItems(context: FinderActionContext, settings: AppSettings): SettingsCategoryWorkbenchItem[] {
  return ACTION_CATEGORY_META
    .map<SettingsCategoryWorkbenchItem>((meta) => {
      const definitions = getContextMenuDefinitions(settings)
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

export function resetCategoryToDefault(settings: AppSettings, category: ActionCategory): AppSettings {
  const meta = ACTION_CATEGORY_META.find((item) => item.category === category);
  if (!meta) {
    return settings;
  }
  return applyCategoryPatch(settings, category, {
    isEnabled: true,
    order: meta.defaultOrder,
    displayStyle: meta.defaultDisplayStyle
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

export function resetActionToDefault(settings: AppSettings, actionID: string): AppSettings {
  const definition = getContextMenuDefinitions(settings).find((item) => item.id === actionID);
  if (!definition) {
    return settings;
  }
  return applyActionPatch(settings, actionID, {
    isEnabled: definition.defaultVisible ?? (definition.implementationStatus ?? "implemented") !== "planned",
    categoryOverride: null,
    orderOverride: null
  });
}

export function moveActionInWorkbench(
  settings: AppSettings,
  actionID: string,
  targetCategory: ActionCategory,
  targetIndex: number
): AppSettings {
  const definitions = getContextMenuDefinitions(settings);
  const targetDefinition = definitions.find((item) => item.id === actionID);
  if (!targetDefinition) {
    return settings;
  }
  const definitionByID = new Map(definitions.map((item) => [item.id, item]));

  const sourceCategory = resolveCategory(targetDefinition, settings);
  const impactedCategories = new Set<ActionCategory>([sourceCategory, targetCategory]);
  const buckets = new Map<ActionCategory, ActionDefinition[]>();

  for (const category of impactedCategories) {
    buckets.set(
      category,
      definitions
        .filter((item) => item.id !== actionID && resolveCategory(item, settings) === category)
        .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
    );
  }

  const targetBucket = buckets.get(targetCategory) ?? [];
  const safeIndex = Math.max(0, Math.min(targetIndex, targetBucket.length));
  targetBucket.splice(safeIndex, 0, { ...targetDefinition, defaultCategory: targetCategory });
  buckets.set(targetCategory, targetBucket);

  let nextSettings = settings;
  for (const [category, items] of buckets.entries()) {
    for (const [index, item] of items.entries()) {
      const originalDefinition = definitionByID.get(item.id);
      nextSettings = applyActionPatch(nextSettings, item.id, {
        categoryOverride: category === originalDefinition?.defaultCategory ? null : category,
        orderOverride: index * 10
      });
    }
  }

  return nextSettings;
}

function getContextMenuDefinitions(settings: AppSettings): ActionDefinition[] {
  return [...ACTION_DEFINITIONS, ...getDynamicActionDefinitions(settings)];
}

export function buildSettingsCategoryInspectorItems(context: FinderActionContext, settings: AppSettings): SettingsCategoryInspectorItem[] {
  return ACTION_CATEGORY_META
    .slice()
    .sort((left, right) => {
      const leftOrder = categorySettingFor(left.category, settings)?.order ?? left.defaultOrder;
      const rightOrder = categorySettingFor(right.category, settings)?.order ?? right.defaultOrder;
      return leftOrder - rightOrder;
    })
    .map<SettingsCategoryInspectorItem>((category) => ({
      category: category.category,
      title: category.title,
      systemImageName: category.systemImageName,
      isEnabled: categorySettingFor(category.category, settings)?.isEnabled ?? true,
      order: categorySettingFor(category.category, settings)?.order ?? category.defaultOrder,
      displayStyle: categorySettingFor(category.category, settings)?.displayStyle ?? category.defaultDisplayStyle,
      actions: buildSettingsActionInspectorItems(category.category, context, settings)
    }));
}

function findDefaultActionSetting(actionID: string): MenuActionSettings {
  return createDefaultActionSettings().find((item) => item.actionID === actionID)
    ?? { actionID, isEnabled: true, categoryOverride: null, orderOverride: null };
}

function findDefaultCategorySetting(category: ActionCategory): MenuCategorySettings {
  return createDefaultCategorySettings().find((item) => item.category === category)
    ?? { category, isEnabled: true, order: 0, displayStyle: "submenu" };
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

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length));
}

function sortedActionIDsForCategory(category: ActionCategory, settings: AppSettings): string[] {
  return ACTION_DEFINITIONS
    .filter((definition) => resolveCategory(definition, settings) === category)
    .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
    .map((definition) => definition.id);
}

function applyOrderedCategoryActionIDs(settings: AppSettings, category: ActionCategory, actionIDs: string[]): Map<string, MenuActionSettings> {
  const updates = new Map<string, MenuActionSettings>();
  actionIDs.forEach((actionID, index) => {
    const definition = definitionFor(actionID);
    if (!definition) {
      return;
    }
    const previous = actionSettingFor(actionID, settings) ?? findDefaultActionSetting(actionID);
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

export function moveSettingsAction(settings: AppSettings, actionID: string, targetCategory: ActionCategory, targetIndex: number): AppSettings {
  const definition = definitionFor(actionID);
  if (!definition) {
    return settings;
  }

  const sourceCategory = resolveCategory(definition, settings);
  const sourceActionIDs = sortedActionIDsForCategory(sourceCategory, settings).filter((id) => id !== actionID);
  const targetActionIDs = sourceCategory === targetCategory
    ? sourceActionIDs.slice()
    : sortedActionIDsForCategory(targetCategory, settings).filter((id) => id !== actionID);

  targetActionIDs.splice(clampIndex(targetIndex, targetActionIDs.length), 0, actionID);

  const updates = new Map<string, MenuActionSettings>();
  for (const [key, value] of applyOrderedCategoryActionIDs(settings, targetCategory, targetActionIDs)) {
    updates.set(key, value);
  }
  if (sourceCategory !== targetCategory) {
    for (const [key, value] of applyOrderedCategoryActionIDs(settings, sourceCategory, sourceActionIDs)) {
      updates.set(key, value);
    }
  }

  return withUpdatedActionSettings(settings, updates);
}

export function moveSettingsCategory(settings: AppSettings, category: ActionCategory, targetIndex: number): AppSettings {
  const categories = settings.contextMenu.categorySettings
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item) => item.category)
    .filter((currentCategory) => currentCategory !== category);

  categories.splice(clampIndex(targetIndex, categories.length), 0, category);

  const updates = new Map<ActionCategory, MenuCategorySettings>();
  categories.forEach((currentCategory, index) => {
    const previous = categorySettingFor(currentCategory, settings) ?? findDefaultCategorySetting(currentCategory);
    updates.set(currentCategory, {
      ...previous,
      order: index * 10
    });
  });

  return withUpdatedCategorySettings(settings, updates);
}

export function resetSettingsAction(settings: AppSettings, actionID: string): AppSettings {
  const defaultSetting = findDefaultActionSetting(actionID);
  return withUpdatedActionSettings(settings, new Map([[actionID, defaultSetting]]));
}

export function resetSettingsCategory(settings: AppSettings, category: ActionCategory): AppSettings {
  const defaultSetting = findDefaultCategorySetting(category);
  return withUpdatedCategorySettings(settings, new Map([[category, defaultSetting]]));
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
