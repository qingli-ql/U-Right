#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const defaultsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "defaults.js");
const usecasePath = path.join(
  repoRoot,
  "electron",
  "dist",
  "main",
  "main",
  "application",
  "settings",
  "save-settings-transaction-usecase.js"
);

const { createDefaultSettings } = require(defaultsPath);
const { saveSettingsTransactionUseCase } = require(usecasePath);

const input = createDefaultSettings();
const canonical = {
  ...input,
  advanced: {
    ...input.advanced,
    debugLogging: true
  }
};
const previousSnapshot = {
  updatedAt: "2026-04-08T00:00:00.000Z",
  settings: input
};
const diagnostics = {
  appGroupIdentifier: "group.test",
  sharedRoot: "/tmp/shared",
  settingsFile: "/tmp/shared/settings.json",
  settingsVersion: 3,
  candidateGroupContainers: ["/tmp/shared"],
  errors: []
};

let saveSettingsCalledWith = null;
let loadPreviousCalled = false;
let loadDiagnosticsCalled = false;

const result = saveSettingsTransactionUseCase(input, {
  saveSettings(settings) {
    saveSettingsCalledWith = settings;
    return canonical;
  },
  loadPreviousSettingsSnapshot() {
    loadPreviousCalled = true;
    return previousSnapshot;
  },
  loadAppDiagnostics() {
    loadDiagnosticsCalled = true;
    return diagnostics;
  }
});

assert.deepStrictEqual(saveSettingsCalledWith, input, "usecase must pass the editing document to saveSettings");
assert.equal(loadPreviousCalled, true, "usecase must refresh previous snapshot inside save transaction");
assert.equal(loadDiagnosticsCalled, true, "usecase must refresh diagnostics inside save transaction");
assert.deepStrictEqual(result.settings, canonical, "usecase must return canonical saved document");
assert.deepStrictEqual(result.previousSnapshot, previousSnapshot, "usecase must return refreshed previous snapshot");
assert.deepStrictEqual(result.diagnostics, diagnostics, "usecase must return refreshed diagnostics");

console.log("Settings save transaction validation OK");
