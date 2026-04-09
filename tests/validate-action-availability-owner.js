#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const contractsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "action-registry.js");
const defaultsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "defaults.js");
const domainPath = path.join(repoRoot, "electron", "dist", "main", "domain", "actions", "action-availability.js");

const { createDefaultSettings } = require(defaultsPath);
const {
  createPreviewContext,
  evaluateActionAvailability
} = require(contractsPath);
const { evaluateActionAvailability: evaluateActionAvailabilityOwner } = require(domainPath);

const settings = createDefaultSettings();
const definition = {
  id: "open.synthetic-terminal",
  title: "Open in Terminal",
  systemImageName: "terminal",
  defaultCategory: "open",
  supportedContexts: ["empty"],
  defaultOrder: 999,
  requiredTool: "terminal"
};
const context = createPreviewContext("empty", {
  terminal: {
    kind: "terminal",
    isInstalled: false
  }
});

const fromContracts = evaluateActionAvailability(definition, context, settings);
const fromDomain = evaluateActionAvailabilityOwner(definition, context, settings);

assert.deepStrictEqual(
  fromContracts,
  fromDomain,
  "contracts.evaluateActionAvailability must delegate to domain owner with identical output"
);
assert.equal(fromContracts.isEnabled, false, "requiredTool missing path must be disabled");
assert.equal(fromContracts.disabledReason, "未检测到 terminal", "requiredTool missing path must carry expected disabledReason");

console.log("Action availability owner validation OK");
