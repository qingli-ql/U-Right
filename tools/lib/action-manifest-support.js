#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.join(repoRoot, "manifest", "actions.json");
const generatedDir = path.join(repoRoot, "manifest", "generated");
const electronGeneratedModulePath = path.join(repoRoot, "electron", "src", "contracts", "generated", "action-manifest.ts");
const swiftGeneratedCatalogPath = path.join(repoRoot, "Sources", "URightShared", "Generated", "ActionCatalog.generated.swift");

const validSelectionKinds = new Set(["file", "folder", "mixed", "empty", "multi"]);
const validActionCategories = new Set(["create", "open", "clipboard", "fileOps", "view", "ai", "scripts", "templates", "git", "advanced"]);
const validToolKinds = new Set(["terminal", "ghostty", "iTerm", "vscode", "cursor", "zed", "claude", "codex", "gh", "lazygit", "gitup"]);
const validStatuses = new Set(["implemented", "beta", "planned"]);
const validChildrenPolicies = new Set(["none", "builtInTemplates", "scripts"]);
const validDisplayStyles = new Set(["inline", "submenu"]);

const swiftLegacyNameMap = {
  "create.new-file": "newFile",
  "create.new-folder": "newFolder",
  "open.terminal": "openTerminal",
  "open.vscode": "openVSCode",
  "open.cursor": "openCursor",
  "open.zed": "openZed",
  "copy.path": "copyPath",
  "copy.relative-path": "copyRelativePath",
  "finder.reveal": "revealInFinder",
  "file.duplicate": "duplicate",
  "file.rename": "rename",
  "file.trash": "trash",
  "file.compress": "compress",
  "view.toggle-hidden": "showHidden",
  "view.refresh": "refresh",
  "copy.filename": "copyFilename",
  "copy.basename": "copyBasename",
  "copy.extension": "copyExtension",
  "file.json-format": "jsonFormat",
  "file.toggle-executable": "toggleExecutable",
  "folder.count": "countItems",
  "folder.size": "folderSize",
  "folder.search": "searchInFolder",
  "git.status": "gitStatus",
  "multi.batch-rename": "batchRename",
  "ai.ask-claude": "aiAskClaude",
  "ai.ask-codex": "aiAskCodex",
  "ai.explain-project": "aiExplainProject",
  "ai.summarize-files": "aiSummarizeFiles",
  "ai.generate-readme": "aiGenerateReadme",
  "ai.generate-gitignore": "aiGenerateGitignore",
  "ai.review-code": "aiReviewCode",
  "ai.refactor-file": "aiRefactorFile",
  "ai.write-tests": "aiWriteTests",
  "ai.explain-error": "aiExplainError",
  "ai.json-schema": "aiJSONSchema",
  "ai.commit-message": "aiCommitMessage",
  "ai.pr-summary": "aiPRSummary",
  "ai.summarize-selection": "aiSummarizeSelection",
  "ai.ask-selection": "aiAskSelection",
  "ai.repeat-last": "repeatLastAIAction"
};

function fail(message) {
  throw new Error(message);
}

function readManifestDocument() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean`);
  }
}

function requireNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    fail(`${label} must be a number`);
  }
}

function validateArray(items, label) {
  if (!Array.isArray(items)) {
    fail(`${label} must be an array`);
  }
}

function toSwiftName(id) {
  const cleaned = id
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[^a-zA-Z]+/, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.length > 0 ? cleaned : "action";
}

function validateManifest(doc) {
  if (!doc || typeof doc !== "object") {
    fail("Manifest document must be an object");
  }
  requireNumber(doc.version, "version");
  validateArray(doc.selectionKinds, "selectionKinds");
  validateArray(doc.toolOrder, "toolOrder");
  validateArray(doc.categories, "categories");
  validateArray(doc.actions, "actions");
  if (!doc.defaults || typeof doc.defaults !== "object") {
    fail("defaults must be an object");
  }
  validateArray(doc.defaults.defaultVisibleAIActionIDs, "defaults.defaultVisibleAIActionIDs");
  validateArray(doc.defaults.promotedActionVisibilityGroups, "defaults.promotedActionVisibilityGroups");

  const selectionKindSet = new Set();
  for (const selectionKind of doc.selectionKinds) {
    requireString(selectionKind, "selectionKinds[]");
    if (!validSelectionKinds.has(selectionKind)) {
      fail(`Unknown selection kind: ${selectionKind}`);
    }
    if (selectionKindSet.has(selectionKind)) {
      fail(`Duplicate selection kind: ${selectionKind}`);
    }
    selectionKindSet.add(selectionKind);
  }

  const toolKindSet = new Set();
  for (const toolKind of doc.toolOrder) {
    requireString(toolKind, "toolOrder[]");
    if (!validToolKinds.has(toolKind)) {
      fail(`Unknown tool kind: ${toolKind}`);
    }
    if (toolKindSet.has(toolKind)) {
      fail(`Duplicate tool kind in toolOrder: ${toolKind}`);
    }
    toolKindSet.add(toolKind);
  }

  const categorySet = new Set();
  for (const category of doc.categories) {
    requireString(category.category, "categories[].category");
    requireString(category.title, "categories[].title");
    requireString(category.systemImageName, "categories[].systemImageName");
    requireNumber(category.defaultOrder, "categories[].defaultOrder");
    requireString(category.defaultDisplayStyle, "categories[].defaultDisplayStyle");
    if (!validActionCategories.has(category.category)) {
      fail(`Unknown category: ${category.category}`);
    }
    if (!validDisplayStyles.has(category.defaultDisplayStyle)) {
      fail(`Unknown category display style: ${category.defaultDisplayStyle}`);
    }
    if (categorySet.has(category.category)) {
      fail(`Duplicate category: ${category.category}`);
    }
    categorySet.add(category.category);
  }

  const actionSet = new Set();
  for (const action of doc.actions) {
    requireString(action.id, "actions[].id");
    requireString(action.title, "actions[].title");
    requireString(action.systemImageName, "actions[].systemImageName");
    requireString(action.defaultCategory, "actions[].defaultCategory");
    validateArray(action.supportedContexts, `actions[${action.id}].supportedContexts`);
    requireString(action.implementationStatus, `actions[${action.id}].implementationStatus`);
    requireNumber(action.defaultOrder, `actions[${action.id}].defaultOrder`);
    requireBoolean(action.defaultVisible, `actions[${action.id}].defaultVisible`);
    requireString(action.childrenPolicy, `actions[${action.id}].childrenPolicy`);
    if (!validActionCategories.has(action.defaultCategory)) {
      fail(`Unknown action category for ${action.id}: ${action.defaultCategory}`);
    }
    if (!categorySet.has(action.defaultCategory)) {
      fail(`Action ${action.id} references undeclared category: ${action.defaultCategory}`);
    }
    if (!validStatuses.has(action.implementationStatus)) {
      fail(`Unknown implementation status for ${action.id}: ${action.implementationStatus}`);
    }
    if (!validChildrenPolicies.has(action.childrenPolicy)) {
      fail(`Unknown children policy for ${action.id}: ${action.childrenPolicy}`);
    }
    if (actionSet.has(action.id)) {
      fail(`Duplicate action id: ${action.id}`);
    }
    actionSet.add(action.id);
    for (const selectionKind of action.supportedContexts) {
      if (!selectionKindSet.has(selectionKind)) {
        fail(`Action ${action.id} references unsupported context: ${selectionKind}`);
      }
    }
    const requirements = action.requirements ?? {};
    if (typeof requirements !== "object" || Array.isArray(requirements)) {
      fail(`Action ${action.id} requirements must be an object`);
    }
    if (requirements.requiredTool != null && !toolKindSet.has(requirements.requiredTool)) {
      fail(`Action ${action.id} references unknown requiredTool: ${requirements.requiredTool}`);
    }
    const boolKeys = [
      "requiresAI",
      "requiresWritableTarget",
      "requiresSingleSelection",
      "requiresDirectoryContext",
      "isDestructive",
      "needsConfirmation"
    ];
    for (const key of boolKeys) {
      if (requirements[key] != null && typeof requirements[key] !== "boolean") {
        fail(`Action ${action.id} requirement ${key} must be boolean`);
      }
    }
  }

  for (const id of doc.defaults.defaultVisibleAIActionIDs) {
    if (!actionSet.has(id)) {
      fail(`defaultVisibleAIActionIDs references missing action: ${id}`);
    }
  }
  for (const group of doc.defaults.promotedActionVisibilityGroups) {
    validateArray(group, "defaults.promotedActionVisibilityGroups[]");
    for (const id of group) {
      if (!actionSet.has(id)) {
        fail(`promotedActionVisibilityGroups references missing action: ${id}`);
      }
    }
  }
}

function normalizeAction(action) {
  const requirements = action.requirements ?? {};
  return {
    id: action.id,
    title: action.title,
    systemImageName: action.systemImageName,
    defaultCategory: action.defaultCategory,
    supportedContexts: action.supportedContexts.slice(),
    implementationStatus: action.implementationStatus,
    defaultOrder: action.defaultOrder,
    defaultVisible: action.defaultVisible,
    childrenPolicy: action.childrenPolicy,
    requirements: {
      requiredTool: requirements.requiredTool ?? null,
      requiresAI: requirements.requiresAI ?? false,
      requiresWritableTarget: requirements.requiresWritableTarget ?? false,
      requiresSingleSelection: requirements.requiresSingleSelection ?? false,
      requiresDirectoryContext: requirements.requiresDirectoryContext ?? false,
      isDestructive: requirements.isDestructive ?? false,
      needsConfirmation: requirements.needsConfirmation ?? false
    }
  };
}

function buildArtifacts(doc) {
  validateManifest(doc);
  const actions = doc.actions.map(normalizeAction);
  const categories = doc.categories.map((category) => ({ ...category }));
  const actionIDs = actions.map((action) => action.id);
  const defaultCategorySettings = categories.map((category) => ({
    category: category.category,
    isEnabled: true,
    order: category.defaultOrder,
    displayStyle: category.defaultDisplayStyle
  }));
  const defaultActionSettings = actions.map((action) => ({
    actionID: action.id,
    isEnabled: action.defaultVisible,
    category: action.defaultCategory,
    order: action.defaultOrder
  }));
  const tsActionDefinitions = actions.map((action) => ({
    id: action.id,
    title: action.title,
    systemImageName: action.systemImageName,
    defaultCategory: action.defaultCategory,
    supportedContexts: action.supportedContexts,
    implementationStatus: action.implementationStatus,
    defaultOrder: action.defaultOrder,
    defaultVisible: action.defaultVisible,
    childrenPolicy: action.childrenPolicy,
    requiredTool: action.requirements.requiredTool,
    requiresAI: action.requirements.requiresAI,
    requiresWritableTarget: action.requirements.requiresWritableTarget,
    requiresSingleSelection: action.requirements.requiresSingleSelection,
    requiresDirectoryContext: action.requirements.requiresDirectoryContext,
    isDestructive: action.requirements.isDestructive,
    needsConfirmation: action.requirements.needsConfirmation
  }));
  const swiftActionDefinitions = actions.map((action) => ({
    id: action.id,
    title: action.title,
    systemImageName: action.systemImageName,
    defaultCategory: action.defaultCategory,
    supportedContexts: action.supportedContexts,
    implementationStatus: action.implementationStatus,
    defaultOrder: action.defaultOrder,
    defaultVisible: action.defaultVisible,
    childrenPolicy: action.childrenPolicy,
    requirements: action.requirements
  }));
  const swiftActionIDConstants = [];
  const seenNames = new Map();
  for (const id of actionIDs.slice().sort()) {
    let name = swiftLegacyNameMap[id] ?? toSwiftName(id);
    const count = seenNames.get(name) ?? 0;
    seenNames.set(name, count + 1);
    if (count > 0) {
      name = `${name}${count + 1}`;
    }
    swiftActionIDConstants.push({ id, name });
  }
  return {
    manifestVersion: doc.version,
    selectionKinds: doc.selectionKinds.slice(),
    toolOrder: doc.toolOrder.slice(),
    defaults: {
      defaultVisibleAIActionIDs: doc.defaults.defaultVisibleAIActionIDs.slice(),
      promotedActionVisibilityGroups: doc.defaults.promotedActionVisibilityGroups.map((group) => group.slice())
    },
    categories,
    defaultCategorySettings,
    defaultActionSettings,
    actionIDs,
    tsActionDefinitions,
    swiftActionDefinitions,
    swiftActionIDConstants
  };
}

function writeJsonFile(targetPath, data) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeTextFile(targetPath, source) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, source, "utf8");
}

function escapeSwiftString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderSwiftContextArray(items) {
  return `[${items.map((item) => `.${item}`).join(", ")}]`;
}

function renderSwiftRequirements(requirements) {
  const fields = [];
  if (requirements.requiredTool) {
    fields.push(`requiredTool: .${requirements.requiredTool}`);
  }
  if (requirements.requiresAI) {
    fields.push("requiresAI: true");
  }
  if (requirements.requiresWritableTarget) {
    fields.push("requiresWritableTarget: true");
  }
  if (requirements.requiresSingleSelection) {
    fields.push("requiresSingleSelection: true");
  }
  if (requirements.requiresDirectoryContext) {
    fields.push("requiresDirectoryContext: true");
  }
  if (requirements.isDestructive) {
    fields.push("isDestructive: true");
  }
  if (requirements.needsConfirmation) {
    fields.push("needsConfirmation: true");
  }
  if (fields.length === 0) {
    return null;
  }
  return `.init(${fields.join(", ")})`;
}

function renderSwiftCatalogSource(artifacts) {
  const categoryLines = artifacts.categories.map((category) => (
    `        .init(category: .${category.category}, title: "${escapeSwiftString(category.title)}", systemImageName: "${escapeSwiftString(category.systemImageName)}", defaultOrder: ${category.defaultOrder}, defaultDisplayStyle: .${category.defaultDisplayStyle}),`
  ));

  const defaultVisibleLines = artifacts.defaults.defaultVisibleAIActionIDs.map((id) => `        "${escapeSwiftString(id)}",`);
  const promotedLines = artifacts.defaults.promotedActionVisibilityGroups.map((group) => (
    `        [${group.map((id) => `"${escapeSwiftString(id)}"`).join(", ")}],`
  ));

  const actionLines = artifacts.swiftActionDefinitions.map((action) => {
    const fields = [
      `id: "${escapeSwiftString(action.id)}"`,
      `title: "${escapeSwiftString(action.title)}"`,
      `systemImageName: "${escapeSwiftString(action.systemImageName)}"`,
      `defaultCategory: .${action.defaultCategory}`,
      `supportedContexts: ${renderSwiftContextArray(action.supportedContexts)}`,
      `implementationStatus: .${action.implementationStatus}`
    ];
    const requirementsExpr = renderSwiftRequirements(action.requirements);
    if (requirementsExpr) {
      fields.push(`requirements: ${requirementsExpr}`);
    }
    fields.push(`defaultOrder: ${action.defaultOrder}`);
    fields.push(`defaultVisible: ${action.defaultVisible ? "true" : "false"}`);
    fields.push(`childrenPolicy: .${action.childrenPolicy}`);
    return `        .init(${fields.join(", ")}),`;
  });

  return `// AUTO-GENERATED FILE. DO NOT EDIT.
// Source of truth: manifest/actions.json

import Foundation

public enum GeneratedActionCatalog {
    public static let categoryDefinitions: [MenuCategoryDefinition] = [
${categoryLines.join("\n")}
    ]

    public static let defaultVisibleAIActionIDs: [String] = [
${defaultVisibleLines.join("\n")}
    ]

    public static let promotedVisibilityGroups: [[String]] = [
${promotedLines.join("\n")}
    ]

    public static let allDefinitions: [ActionDefinition] = [
${actionLines.join("\n")}
    ]
}
`;
}

function renderElectronManifestModuleSource(artifacts) {
  const payload = {
    selectionKinds: artifacts.selectionKinds,
    toolOrder: artifacts.toolOrder,
    defaults: artifacts.defaults,
    categories: artifacts.categories,
    actionDefinitions: artifacts.tsActionDefinitions
  };

  return `// AUTO-GENERATED FILE. DO NOT EDIT.
// Source of truth: manifest/actions.json

export const GENERATED_MANIFEST_DATA = ${JSON.stringify(payload, null, 2)} as const;
`;
}

function renderActionStatusFragment(artifacts) {
  const lines = [
    "<!-- AUTO-GENERATED FILE. DO NOT EDIT. -->",
    "<!-- Source of truth: manifest/actions.json -->",
    "",
    `Manifest version: ${artifacts.manifestVersion}`,
    "",
    "| ID | Status | Category | Default Visible | Contexts | Required Tool |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const action of artifacts.tsActionDefinitions) {
    lines.push(
      `| ${action.id} | ${action.implementationStatus} | ${action.defaultCategory} | ${action.defaultVisible ? "yes" : "no"} | ${action.supportedContexts.join(", ")} | ${action.requiredTool ?? "-"} |`
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

module.exports = {
  repoRoot,
  manifestPath,
  generatedDir,
  electronGeneratedModulePath,
  swiftGeneratedCatalogPath,
  readManifestDocument,
  validateManifest,
  buildArtifacts,
  writeJsonFile,
  writeTextFile,
  renderSwiftCatalogSource,
  renderElectronManifestModuleSource,
  renderActionStatusFragment
};
