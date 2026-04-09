"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_ORDER = exports.ACTION_DEFINITIONS = exports.PROMOTED_ACTION_VISIBILITY_GROUPS = exports.DEFAULT_VISIBLE_AI_ACTION_IDS = exports.BUILT_IN_TEMPLATE_TITLES = exports.ACTION_CATEGORY_META = void 0;
exports.definitionFor = definitionFor;
exports.actionTitleFor = actionTitleFor;
exports.getUserTemplates = getUserTemplates;
exports.getRuntimeTemplateDefinitions = getRuntimeTemplateDefinitions;
exports.createDefaultCategorySettings = createDefaultCategorySettings;
exports.createDefaultActionSettings = createDefaultActionSettings;
exports.actionSettingFor = actionSettingFor;
exports.categorySettingFor = categorySettingFor;
exports.resolveCategory = resolveCategory;
exports.resolveOrder = resolveOrder;
exports.evaluateActionAvailability = evaluateActionAvailability;
exports.describeActionPlacement = describeActionPlacement;
exports.buildPreviewDescriptors = buildPreviewDescriptors;
exports.buildSettingsActionInspectorItems = buildSettingsActionInspectorItems;
exports.buildSettingsCategoryWorkbenchItems = buildSettingsCategoryWorkbenchItems;
exports.applyCategoryReorder = applyCategoryReorder;
exports.applyCategoryPatch = applyCategoryPatch;
exports.resetCategoryToDefault = resetCategoryToDefault;
exports.applyActionPatch = applyActionPatch;
exports.resetActionToDefault = resetActionToDefault;
exports.moveActionInWorkbench = moveActionInWorkbench;
exports.buildSettingsCategoryInspectorItems = buildSettingsCategoryInspectorItems;
exports.moveSettingsAction = moveSettingsAction;
exports.moveSettingsCategory = moveSettingsCategory;
exports.resetSettingsAction = resetSettingsAction;
exports.resetSettingsCategory = resetSettingsCategory;
exports.createPreviewContext = createPreviewContext;
const action_manifest_1 = require("./generated/action-manifest");
const resolved_settings_1 = require("./resolved-settings");
const GENERATED_MANIFEST = action_manifest_1.GENERATED_MANIFEST_DATA;
const ALL_SELECTION_KINDS = [...GENERATED_MANIFEST.selectionKinds];
exports.ACTION_CATEGORY_META = GENERATED_MANIFEST.categories.map((item) => ({ ...item }));
exports.BUILT_IN_TEMPLATE_TITLES = {
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
exports.DEFAULT_VISIBLE_AI_ACTION_IDS = [...GENERATED_MANIFEST.defaults.defaultVisibleAIActionIDs];
exports.PROMOTED_ACTION_VISIBILITY_GROUPS = GENERATED_MANIFEST.defaults.promotedActionVisibilityGroups.map((group) => [...group]);
exports.ACTION_DEFINITIONS = GENERATED_MANIFEST.actionDefinitions.map((item) => ({
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
exports.TOOL_ORDER = [...GENERATED_MANIFEST.toolOrder];
function definitionFor(actionID) {
    return exports.ACTION_DEFINITIONS.find((item) => item.id === actionID);
}
function actionTitleFor(actionID) {
    const known = definitionFor(actionID);
    if (known) {
        return known.title;
    }
    if (actionID.startsWith("create.template.")) {
        const templateID = actionID.slice("create.template.".length);
        return exports.BUILT_IN_TEMPLATE_TITLES[templateID] ?? actionID;
    }
    if (actionID.startsWith("script.run.")) {
        return actionID.slice("script.run.".length);
    }
    return actionID;
}
function getUserTemplates(settings) {
    return (0, resolved_settings_1.getTemplateSettings)(settings).userTemplates ?? [];
}
function getRuntimeTemplateDefinitions(settings) {
    const hiddenBuiltInTemplateIDs = new Set((0, resolved_settings_1.getTemplateSettings)(settings).hiddenBuiltInTemplateIDs ?? []);
    const builtins = Object.entries(exports.BUILT_IN_TEMPLATE_TITLES)
        .filter(([id]) => !hiddenBuiltInTemplateIDs.has(id))
        .map(([id, title]) => ({
        id,
        title,
        fileNameSuggestion: id === "markdown" ? "README" :
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
        fileExtension: id === "markdown" || id === "readme" ? "md" :
            id === "text" ? "txt" :
                id === "json" ? "json" :
                    id === "python" ? "py" :
                        id === "shell" ? "sh" :
                            id === "html" ? "html" :
                                id === "css" ? "css" :
                                    id === "javascript" ? "js" :
                                        id === "typescript" ? "ts" :
                                            "",
        starterContent: id === "markdown" ? "# Title\n\n" :
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
        .map((item) => ({
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
function getDynamicActionDefinitions(settings) {
    return (settings.customActions?.openActions ?? [])
        .filter((item) => item.isEnabled)
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item, index) => ({
        id: `open.custom.${item.id}`,
        title: item.name,
        systemImageName: "app.badge",
        defaultCategory: item.category,
        supportedContexts: item.targetKind === "file" ? ["file", "mixed", "multi"] :
            item.targetKind === "folder" ? ["folder", "empty", "mixed", "multi"] :
                ALL_SELECTION_KINDS,
        defaultOrder: 1000 + index,
        defaultVisible: true
    }));
}
function createDefaultCategorySettings() {
    return exports.ACTION_CATEGORY_META.map((item) => ({
        category: item.category,
        isEnabled: true,
        order: item.defaultOrder,
        displayStyle: item.defaultDisplayStyle
    }));
}
function createDefaultActionSettings() {
    return exports.ACTION_DEFINITIONS.map((action) => ({
        actionID: action.id,
        isEnabled: action.defaultVisible ?? action.implementationStatus !== "planned",
        categoryOverride: null,
        orderOverride: null
    }));
}
function actionSettingFor(actionID, settings) {
    return settings.contextMenu.actionSettings.find((item) => item.actionID === actionID);
}
function categorySettingFor(category, settings) {
    return settings.contextMenu.categorySettings.find((item) => item.category === category);
}
function resolveCategory(definition, settings) {
    return actionSettingFor(definition.id, settings)?.categoryOverride ?? definition.defaultCategory;
}
function resolveOrder(definition, settings) {
    return actionSettingFor(definition.id, settings)?.orderOverride ?? definition.defaultOrder;
}
function hasWorkingDirectory(context) {
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
function hasWritableTarget(context) {
    if (typeof context.capabilities?.hasWritableTarget === "boolean") {
        return context.capabilities.hasWritableTarget;
    }
    return context.selectionKind === "file" || context.selectionKind === "folder" || context.selectionKind === "empty" || context.selectionKind === "multi";
}
function currentTargetDirectory(context) {
    return context.resolvedTargetDirectory ?? context.resolvedSelectionDirectory ?? context.currentDirectoryURL ?? null;
}
function currentTargetLabel(definition, context) {
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
function formatDisabledReason(definition, reason) {
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
function hasAvailableAIBackend(context, definition) {
    if (definition.id === "ai.ask-claude") {
        return context.detectedTools.claude?.isInstalled === true;
    }
    if (definition.id === "ai.ask-codex") {
        return context.detectedTools.codex?.isInstalled === true;
    }
    return context.detectedTools.claude?.isInstalled === true || context.detectedTools.codex?.isInstalled === true;
}
function missingAIBackendReason(definition) {
    if (definition.id === "ai.ask-claude") {
        return "未检测到 Claude CLI";
    }
    if (definition.id === "ai.ask-codex") {
        return "未检测到 Codex CLI";
    }
    return "未检测到可用 AI CLI";
}
function evaluateActionAvailability(definition, context, settings) {
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
        if (!(0, resolved_settings_1.getAIActionVisibility)(settings).includes(definition.id)) {
            return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "AI 动作未启用") };
        }
        if (!hasAvailableAIBackend(context, definition)) {
            return {
                isVisible: settings.contextMenu.showUnavailableInPreview,
                isEnabled: false,
                disabledReason: formatDisabledReason(definition, missingAIBackendReason(definition))
            };
        }
    }
    if (definition.requiredTool) {
        const preference = (0, resolved_settings_1.getIntegrationSettings)(settings).toolPreferences.find((item) => item.kind === definition.requiredTool);
        if (!(preference?.allowMenuActions ?? true)) {
            return { isVisible: false, isEnabled: false, disabledReason: formatDisabledReason(definition, "工具动作已禁用") };
        }
        if (!(context.detectedTools[definition.requiredTool]?.isInstalled === true)) {
            return { isVisible: settings.contextMenu.showUnavailableInPreview, isEnabled: false, disabledReason: formatDisabledReason(definition, `未检测到 ${definition.requiredTool}`) };
        }
    }
    return { isVisible: true, isEnabled: true };
}
function placementPathForAction(descriptors, actionID, trail = []) {
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
function describeActionPlacement(actionID, context, settings) {
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
function templateChildren(context, settings) {
    const output = [];
    for (const [index, template] of getRuntimeTemplateDefinitions(settings).entries()) {
        const definition = {
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
function scriptChildren(context) {
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
function buildPreviewDescriptors(context, settings) {
    const categories = exports.ACTION_CATEGORY_META.slice().sort((left, right) => {
        const leftOrder = categorySettingFor(left.category, settings)?.order ?? left.defaultOrder;
        const rightOrder = categorySettingFor(right.category, settings)?.order ?? right.defaultOrder;
        return leftOrder - rightOrder;
    });
    const output = [];
    for (const category of categories) {
        if (!(categorySettingFor(category.category, settings)?.isEnabled ?? true)) {
            continue;
        }
        const actions = [...exports.ACTION_DEFINITIONS, ...getDynamicActionDefinitions(settings)]
            .filter((definition) => resolveCategory(definition, settings) === category.category)
            .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
            .reduce((items, definition) => {
            const availability = evaluateActionAvailability(definition, context, settings);
            if (!availability.isVisible && !settings.contextMenu.showUnavailableInPreview) {
                return items;
            }
            const children = definition.childrenPolicy === "builtInTemplates" ? templateChildren(context, settings) :
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
        }
        else {
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
function buildSettingsActionInspectorItems(category, context, settings) {
    const previewTree = buildPreviewDescriptors(context, settings);
    return getContextMenuDefinitions(settings)
        .filter((definition) => resolveCategory(definition, settings) === category)
        .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
        .map((definition) => {
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
function buildSettingsCategoryWorkbenchItems(context, settings) {
    return exports.ACTION_CATEGORY_META
        .map((meta) => {
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
function applyCategoryReorder(settings, orderedCategories) {
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
function applyCategoryPatch(settings, category, patch) {
    return {
        ...settings,
        contextMenu: {
            ...settings.contextMenu,
            categorySettings: settings.contextMenu.categorySettings.map((item) => item.category === category ? { ...item, ...patch } : item)
        }
    };
}
function resetCategoryToDefault(settings, category) {
    const meta = exports.ACTION_CATEGORY_META.find((item) => item.category === category);
    if (!meta) {
        return settings;
    }
    return applyCategoryPatch(settings, category, {
        isEnabled: true,
        order: meta.defaultOrder,
        displayStyle: meta.defaultDisplayStyle
    });
}
function applyActionPatch(settings, actionID, patch) {
    return {
        ...settings,
        contextMenu: {
            ...settings.contextMenu,
            actionSettings: settings.contextMenu.actionSettings.map((item) => item.actionID === actionID ? { ...item, ...patch } : item)
        }
    };
}
function resetActionToDefault(settings, actionID) {
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
function moveActionInWorkbench(settings, actionID, targetCategory, targetIndex) {
    const definitions = getContextMenuDefinitions(settings);
    const targetDefinition = definitions.find((item) => item.id === actionID);
    if (!targetDefinition) {
        return settings;
    }
    const definitionByID = new Map(definitions.map((item) => [item.id, item]));
    const sourceCategory = resolveCategory(targetDefinition, settings);
    const impactedCategories = new Set([sourceCategory, targetCategory]);
    const buckets = new Map();
    for (const category of impactedCategories) {
        buckets.set(category, definitions
            .filter((item) => item.id !== actionID && resolveCategory(item, settings) === category)
            .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings)));
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
function getContextMenuDefinitions(settings) {
    return [...exports.ACTION_DEFINITIONS, ...getDynamicActionDefinitions(settings)];
}
function buildSettingsCategoryInspectorItems(context, settings) {
    return exports.ACTION_CATEGORY_META
        .slice()
        .sort((left, right) => {
        const leftOrder = categorySettingFor(left.category, settings)?.order ?? left.defaultOrder;
        const rightOrder = categorySettingFor(right.category, settings)?.order ?? right.defaultOrder;
        return leftOrder - rightOrder;
    })
        .map((category) => ({
        category: category.category,
        title: category.title,
        systemImageName: category.systemImageName,
        isEnabled: categorySettingFor(category.category, settings)?.isEnabled ?? true,
        order: categorySettingFor(category.category, settings)?.order ?? category.defaultOrder,
        displayStyle: categorySettingFor(category.category, settings)?.displayStyle ?? category.defaultDisplayStyle,
        actions: buildSettingsActionInspectorItems(category.category, context, settings)
    }));
}
function findDefaultActionSetting(actionID) {
    return createDefaultActionSettings().find((item) => item.actionID === actionID)
        ?? { actionID, isEnabled: true, categoryOverride: null, orderOverride: null };
}
function findDefaultCategorySetting(category) {
    return createDefaultCategorySettings().find((item) => item.category === category)
        ?? { category, isEnabled: true, order: 0, displayStyle: "submenu" };
}
function withUpdatedActionSettings(settings, updates) {
    return {
        ...settings,
        contextMenu: {
            ...settings.contextMenu,
            actionSettings: settings.contextMenu.actionSettings.map((item) => updates.get(item.actionID) ?? item)
        }
    };
}
function withUpdatedCategorySettings(settings, updates) {
    return {
        ...settings,
        contextMenu: {
            ...settings.contextMenu,
            categorySettings: settings.contextMenu.categorySettings.map((item) => updates.get(item.category) ?? item)
        }
    };
}
function clampIndex(index, length) {
    return Math.max(0, Math.min(index, length));
}
function sortedActionIDsForCategory(category, settings) {
    return exports.ACTION_DEFINITIONS
        .filter((definition) => resolveCategory(definition, settings) === category)
        .sort((left, right) => resolveOrder(left, settings) - resolveOrder(right, settings))
        .map((definition) => definition.id);
}
function applyOrderedCategoryActionIDs(settings, category, actionIDs) {
    const updates = new Map();
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
function moveSettingsAction(settings, actionID, targetCategory, targetIndex) {
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
    const updates = new Map();
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
function moveSettingsCategory(settings, category, targetIndex) {
    const categories = settings.contextMenu.categorySettings
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((item) => item.category)
        .filter((currentCategory) => currentCategory !== category);
    categories.splice(clampIndex(targetIndex, categories.length), 0, category);
    const updates = new Map();
    categories.forEach((currentCategory, index) => {
        const previous = categorySettingFor(currentCategory, settings) ?? findDefaultCategorySetting(currentCategory);
        updates.set(currentCategory, {
            ...previous,
            order: index * 10
        });
    });
    return withUpdatedCategorySettings(settings, updates);
}
function resetSettingsAction(settings, actionID) {
    const defaultSetting = findDefaultActionSetting(actionID);
    return withUpdatedActionSettings(settings, new Map([[actionID, defaultSetting]]));
}
function resetSettingsCategory(settings, category) {
    const defaultSetting = findDefaultCategorySetting(category);
    return withUpdatedCategorySettings(settings, new Map([[category, defaultSetting]]));
}
function createPreviewContext(selectionKind, detectedTools, options) {
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
