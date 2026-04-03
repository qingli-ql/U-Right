#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const tsRegistryPath = path.join(repoRoot, "electron", "src", "shared", "action-registry.ts");
const swiftOutputDir = path.join(repoRoot, "Sources", "URightShared", "Generated");
const swiftOutputPath = path.join(swiftOutputDir, "ActionIDs.generated.swift");

const source = fs.readFileSync(tsRegistryPath, "utf8");
const actionDefinitionRegex = /\{\s*id:\s*"([^"]+)"/g;
const ids = [];
for (const match of source.matchAll(actionDefinitionRegex)) {
  ids.push(match[1]);
}

const uniqueIds = Array.from(new Set(ids)).sort();

function toSwiftName(id) {
  const cleaned = id
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[^a-zA-Z]+/, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.length > 0 ? cleaned : "action";
}

const legacyNameMap = {
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

const seenNames = new Map();
const lines = [];
for (const id of uniqueIds) {
  let name = legacyNameMap[id] ?? toSwiftName(id);
  const count = seenNames.get(name) ?? 0;
  seenNames.set(name, count + 1);
  if (count > 0) {
    name = `${name}${count + 1}`;
  }
  lines.push(`    public static let ${name} = "${id}"`);
}

const output = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Source of truth: electron/src/shared/action-registry.ts (ACTION_DEFINITIONS)

import Foundation

public enum ActionIDs {
    public static let newFromTemplatePrefix = "create.template."
    public static let scriptRunPrefix = "script.run."
    public static let openCustomPrefix = "open.custom."
${lines.join("\n")}
}
`;

fs.mkdirSync(swiftOutputDir, { recursive: true });
fs.writeFileSync(swiftOutputPath, output, "utf8");
console.log(`Generated ${path.relative(repoRoot, swiftOutputPath)} with ${uniqueIds.length} action IDs.`);
