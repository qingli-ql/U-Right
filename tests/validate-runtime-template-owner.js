#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const contractsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "action-registry.js");
const defaultsPath = path.join(repoRoot, "electron", "dist", "main", "contracts", "defaults.js");
const domainPath = path.join(repoRoot, "electron", "dist", "main", "domain", "actions", "runtime-template-definitions.js");

const { createDefaultSettings } = require(defaultsPath);
const { getRuntimeTemplateDefinitions } = require(contractsPath);
const { getRuntimeTemplateDefinitions: getRuntimeTemplateDefinitionsFromDomain } = require(domainPath);

const settings = createDefaultSettings();
settings.templates.hiddenBuiltInTemplateIDs = ["markdown", "json"];
settings.templates.userTemplates = [
  {
    id: "second",
    name: "Second Template",
    fileExtension: "txt",
    defaultFileName: "second",
    starterContent: "second",
    makeExecutable: false,
    isEnabled: true,
    sortOrder: 2
  },
  {
    id: "first",
    name: "First Template",
    fileExtension: "md",
    defaultFileName: "first",
    starterContent: "# first",
    makeExecutable: false,
    isEnabled: true,
    sortOrder: 1
  },
  {
    id: "disabled",
    name: "Disabled Template",
    fileExtension: "txt",
    defaultFileName: "disabled",
    starterContent: "disabled",
    makeExecutable: false,
    isEnabled: false,
    sortOrder: 0
  }
];

const fromContracts = getRuntimeTemplateDefinitions(settings);
const fromDomain = getRuntimeTemplateDefinitionsFromDomain(settings);

assert.deepStrictEqual(
  fromContracts,
  fromDomain,
  "contracts.getRuntimeTemplateDefinitions must delegate to the domain owner with identical output"
);

assert.ok(
  fromContracts.every((item) => item.id !== "markdown" && item.id !== "json"),
  "hidden built-in templates should be excluded"
);

const userIDs = fromContracts.filter((item) => item.source === "user").map((item) => item.id);
assert.deepStrictEqual(userIDs, ["user.first", "user.second"], "enabled user templates should be ordered by sortOrder");

console.log("Runtime template owner validation OK");
