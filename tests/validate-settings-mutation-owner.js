#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const contractsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "action-registry.js");
const defaultsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "defaults.js");
const domainPath = path.join(repoRoot, "electron", "dist", "main", "domain", "settings", "settings-mutation-service.js");

const { createDefaultSettings } = require(defaultsPath);
const {
  ACTION_CATEGORY_META,
  ACTION_DEFINITIONS,
  applyActionPatch,
  applyCategoryPatch,
  applyCategoryReorder,
  moveActionInWorkbench,
  moveSettingsAction,
  moveSettingsCategory,
  resetActionToDefault,
  resetCategoryToDefault,
  resetSettingsAction,
  resetSettingsCategory
} = require(contractsPath);
const {
  applyActionPatch: applyActionPatchFromDomain,
  applyCategoryPatch: applyCategoryPatchFromDomain,
  applyCategoryReorder: applyCategoryReorderFromDomain,
  moveActionInWorkbench: moveActionInWorkbenchFromDomain,
  moveSettingsAction: moveSettingsActionFromDomain,
  moveSettingsCategory: moveSettingsCategoryFromDomain,
  resetActionToDefault: resetActionToDefaultFromDomain,
  resetCategoryToDefault: resetCategoryToDefaultFromDomain,
  resetSettingsAction: resetSettingsActionFromDomain,
  resetSettingsCategory: resetSettingsCategoryFromDomain
} = require(domainPath);

const settings = createDefaultSettings();
const orderedCategories = ACTION_CATEGORY_META.map((item) => item.category).reverse();

assert.deepStrictEqual(
  applyCategoryPatch(settings, "open", { isEnabled: false }),
  applyCategoryPatchFromDomain(settings, "open", { isEnabled: false }),
  "contracts.applyCategoryPatch must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  applyActionPatch(settings, "open.terminal", { isEnabled: false }),
  applyActionPatchFromDomain(settings, "open.terminal", { isEnabled: false }),
  "contracts.applyActionPatch must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  applyCategoryReorder(settings, orderedCategories),
  applyCategoryReorderFromDomain(settings, orderedCategories),
  "contracts.applyCategoryReorder must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  moveActionInWorkbench(settings, "open.cursor", "open", 0),
  moveActionInWorkbenchFromDomain(ACTION_DEFINITIONS, settings, "open.cursor", "open", 0),
  "contracts.moveActionInWorkbench must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  resetActionToDefault(applyActionPatch(settings, "open.terminal", { isEnabled: false }), "open.terminal"),
  resetActionToDefaultFromDomain(
    ACTION_DEFINITIONS,
    applyActionPatchFromDomain(settings, "open.terminal", { isEnabled: false }),
    "open.terminal"
  ),
  "contracts.resetActionToDefault must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  resetCategoryToDefault(applyCategoryPatch(settings, "open", { isEnabled: false, order: 900 }), "open"),
  resetCategoryToDefaultFromDomain(
    ACTION_CATEGORY_META,
    applyCategoryPatchFromDomain(settings, "open", { isEnabled: false, order: 900 }),
    "open"
  ),
  "contracts.resetCategoryToDefault must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  moveSettingsAction(settings, "open.cursor", "open", 0),
  moveSettingsActionFromDomain(ACTION_DEFINITIONS, settings, "open.cursor", "open", 0),
  "contracts.moveSettingsAction must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  moveSettingsCategory(settings, "open", 0),
  moveSettingsCategoryFromDomain(ACTION_CATEGORY_META, settings, "open", 0),
  "contracts.moveSettingsCategory must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  resetSettingsAction(applyActionPatch(settings, "open.terminal", { orderOverride: 999 }), "open.terminal"),
  resetSettingsActionFromDomain(
    ACTION_DEFINITIONS,
    applyActionPatchFromDomain(settings, "open.terminal", { orderOverride: 999 }),
    "open.terminal"
  ),
  "contracts.resetSettingsAction must delegate to mutation owner with identical output"
);

assert.deepStrictEqual(
  resetSettingsCategory(applyCategoryPatch(settings, "open", { order: 999 }), "open"),
  resetSettingsCategoryFromDomain(
    ACTION_CATEGORY_META,
    applyCategoryPatchFromDomain(settings, "open", { order: 999 }),
    "open"
  ),
  "contracts.resetSettingsCategory must delegate to mutation owner with identical output"
);

console.log("Settings mutation owner validation OK");
