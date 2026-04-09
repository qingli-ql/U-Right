#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const contractsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "action-registry.js");
const defaultsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "defaults.js");
const domainPath = path.join(repoRoot, "electron", "dist", "main", "domain", "actions", "action-projection-service.js");

const { createDefaultSettings } = require(defaultsPath);
const {
  ACTION_CATEGORY_META,
  ACTION_DEFINITIONS,
  buildPreviewDescriptors,
  buildSettingsActionInspectorItems,
  buildSettingsCategoryWorkbenchItems,
  createPreviewContext,
  describeActionPlacement
} = require(contractsPath);
const {
  buildPreviewDescriptors: buildPreviewDescriptorsFromDomain,
  buildSettingsActionInspectorItems: buildSettingsActionInspectorItemsFromDomain,
  buildSettingsCategoryWorkbenchItems: buildSettingsCategoryWorkbenchItemsFromDomain,
  describeActionPlacement: describeActionPlacementFromDomain
} = require(domainPath);

const settings = createDefaultSettings();
const context = createPreviewContext("empty", {
  terminal: {
    kind: "terminal",
    isInstalled: true
  },
  claude: {
    kind: "claude",
    isInstalled: true
  }
});

const previewFromContracts = buildPreviewDescriptors(context, settings);
const previewFromDomain = buildPreviewDescriptorsFromDomain(ACTION_DEFINITIONS, ACTION_CATEGORY_META, context, settings);
assert.deepStrictEqual(
  previewFromContracts,
  previewFromDomain,
  "contracts.buildPreviewDescriptors must delegate to the domain projection owner with identical output"
);

const inspectorFromContracts = buildSettingsActionInspectorItems("open", context, settings);
const inspectorFromDomain = buildSettingsActionInspectorItemsFromDomain(ACTION_DEFINITIONS, ACTION_CATEGORY_META, "open", context, settings);
assert.deepStrictEqual(
  inspectorFromContracts,
  inspectorFromDomain,
  "contracts.buildSettingsActionInspectorItems must delegate to the domain projection owner with identical output"
);

const workbenchFromContracts = buildSettingsCategoryWorkbenchItems(context, settings);
const workbenchFromDomain = buildSettingsCategoryWorkbenchItemsFromDomain(ACTION_DEFINITIONS, ACTION_CATEGORY_META, context, settings);
assert.deepStrictEqual(
  workbenchFromContracts,
  workbenchFromDomain,
  "contracts.buildSettingsCategoryWorkbenchItems must delegate to the domain projection owner with identical output"
);

const placementFromContracts = describeActionPlacement("open.terminal", context, settings);
const placementFromDomain = describeActionPlacementFromDomain(ACTION_DEFINITIONS, ACTION_CATEGORY_META, "open.terminal", context, settings);
assert.equal(
  placementFromContracts,
  placementFromDomain,
  "contracts.describeActionPlacement must delegate to the domain projection owner with identical output"
);

console.log("Action projection owner validation OK");
