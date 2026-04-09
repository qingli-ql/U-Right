#!/usr/bin/env node

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const contractsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "action-registry.js");
const defaultsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "defaults.js");
const domainPath = path.join(repoRoot, "electron", "dist", "main", "domain", "actions", "action-projection-service.js");

const { createDefaultSettings } = require(defaultsPath);
const { ACTION_CATEGORY_META, ACTION_DEFINITIONS, createPreviewContext } = require(contractsPath);
const { buildPreviewDescriptors } = require(domainPath);

function disableScriptsCategory(settings) {
  const scriptsCategory = settings.contextMenu.categorySettings.find((item) => item.category === "scripts");
  if (scriptsCategory) {
    scriptsCategory.isEnabled = false;
  }
}

function createCase(name, selectionKind, tools, mutateSettings) {
  const settings = createDefaultSettings();
  settings.contextMenu.showUnavailableInPreview = true;
  disableScriptsCategory(settings);
  if (mutateSettings) {
    mutateSettings(settings);
  }
  const context = createPreviewContext(selectionKind, tools, {
    scriptNames: [],
    hasWorkingDirectory: true,
    hasWritableTarget: true
  });
  return { name, settings, context };
}

function flattenLeaves(descriptors, output = []) {
  for (const descriptor of descriptors) {
    if (descriptor.children.length === 0) {
      output.push({
        actionID: descriptor.id,
        category: descriptor.category,
        disabledReason: descriptor.statusBadge ?? null
      });
      continue;
    }
    flattenLeaves(descriptor.children, output);
  }
  return output;
}

function summarizeLeaves(leaves) {
  const ordered = leaves.slice().sort((left, right) => left.actionID.localeCompare(right.actionID));
  return {
    leafActions: ordered.map((item) => item.actionID),
    categoryPlacement: Object.fromEntries(ordered.map((item) => [item.actionID, item.category])),
    disabledReasons: Object.fromEntries(
      ordered.filter((item) => item.disabledReason).map((item) => [item.actionID, item.disabledReason])
    )
  };
}

function summarizeTS(settings, context) {
  const descriptors = buildPreviewDescriptors(ACTION_DEFINITIONS, ACTION_CATEGORY_META, context, settings);
  return summarizeLeaves(flattenLeaves(descriptors));
}

function summarizeSwift(cases) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "uright-runtime-parity-"));
  const fixturePath = path.join(tempRoot, "parity-fixture.json");
  fs.writeFileSync(fixturePath, JSON.stringify({ cases }), "utf8");

  const stdout = execFileSync(
    "swift",
    ["run", "RuntimeParityEmitter", fixturePath],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );
  return JSON.parse(stdout);
}

function compareCase(name, expected, actual) {
  assert.deepStrictEqual(actual.leafActions, expected.leafActions, `${name}: leaf actions mismatch`);
  assert.deepStrictEqual(actual.categoryPlacement, expected.categoryPlacement, `${name}: category placement mismatch`);
  assert.deepStrictEqual(actual.disabledReasons, expected.disabledReasons, `${name}: disabled reason mismatch`);
}

function main() {
  const cases = [
    createCase(
      "file-missing-ai",
      "file",
      {
        terminal: { kind: "terminal", isInstalled: true },
        claude: { kind: "claude", isInstalled: false },
        codex: { kind: "codex", isInstalled: false }
      }
    ),
    createCase(
      "folder-missing-ghostty",
      "folder",
      {
        terminal: { kind: "terminal", isInstalled: true },
        ghostty: { kind: "ghostty", isInstalled: false },
        claude: { kind: "claude", isInstalled: true },
        codex: { kind: "codex", isInstalled: false }
      },
      (settings) => {
        settings.ai.enabled = true;
      }
    ),
    createCase(
      "multi-tools-present",
      "multi",
      {
        terminal: { kind: "terminal", isInstalled: true },
        claude: { kind: "claude", isInstalled: true },
        codex: { kind: "codex", isInstalled: true },
        vscode: { kind: "vscode", isInstalled: true }
      }
    ),
    createCase(
      "empty-ai-disabled",
      "empty",
      {
        terminal: { kind: "terminal", isInstalled: true },
        claude: { kind: "claude", isInstalled: true },
        codex: { kind: "codex", isInstalled: true }
      },
      (settings) => {
        settings.ai.enabled = false;
      }
    )
  ];

  const tsByCase = new Map(
    cases.map((item) => [item.name, summarizeTS(item.settings, item.context)])
  );
  const swiftResult = summarizeSwift(cases);
  const swiftByCase = new Map(swiftResult.cases.map((item) => [item.name, item]));

  for (const [name, expected] of tsByCase.entries()) {
    const actual = swiftByCase.get(name);
    assert.ok(actual, `${name}: missing Swift parity output`);
    compareCase(name, expected, actual);
  }

  console.log(`Runtime parity validation OK (${cases.length} cases)`);
}

main();
