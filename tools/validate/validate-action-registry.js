#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  readManifestDocument,
  buildArtifacts
} = require("../lib/action-manifest-support");

const repoRoot = path.resolve(__dirname, "..", "..");
const swiftPath = path.join(repoRoot, "Sources", "URightShared", "Generated", "ActionIDs.generated.swift");
const tsGeneratedPath = path.join(repoRoot, "manifest", "generated", "ts-action-definitions.json");
const swiftGeneratedPath = path.join(repoRoot, "manifest", "generated", "swift-action-definitions.json");
const categoryGeneratedPath = path.join(repoRoot, "manifest", "generated", "category-definitions.json");
const defaultsGeneratedPath = path.join(repoRoot, "manifest", "generated", "defaults.json");
const defaultCategorySettingsPath = path.join(repoRoot, "manifest", "generated", "default-category-settings.json");
const defaultActionSettingsPath = path.join(repoRoot, "manifest", "generated", "default-action-settings.json");
const actionStatusFragmentPath = path.join(repoRoot, "manifest", "generated", "action-status-fragment.md");
const fixturesDir = path.join(repoRoot, "tests", "fixtures", "action-manifest");

const swiftSource = fs.readFileSync(swiftPath, "utf8");
const tsGenerated = JSON.parse(fs.readFileSync(tsGeneratedPath, "utf8"));
const swiftGenerated = JSON.parse(fs.readFileSync(swiftGeneratedPath, "utf8"));
const categoryGenerated = JSON.parse(fs.readFileSync(categoryGeneratedPath, "utf8"));
const defaultsGenerated = JSON.parse(fs.readFileSync(defaultsGeneratedPath, "utf8"));
const defaultCategorySettingsGenerated = JSON.parse(fs.readFileSync(defaultCategorySettingsPath, "utf8"));
const defaultActionSettingsGenerated = JSON.parse(fs.readFileSync(defaultActionSettingsPath, "utf8"));
const actionStatusFragmentGenerated = fs.readFileSync(actionStatusFragmentPath, "utf8");
const manifestArtifacts = buildArtifacts(readManifestDocument());

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortObjectKeys(value[key])])
    );
  }
  return value;
}

function toMap(items, label, idSelector = (item) => item.id) {
  if (!Array.isArray(items)) {
    throw new Error(`${label} must be an array`);
  }
  const output = new Map();
  for (const item of items) {
    const id = idSelector(item);
    if (output.has(id)) {
      throw new Error(`Duplicate ${label} entry for ${id}`);
    }
    output.set(id, item);
  }
  return output;
}

function collectMismatches(expectedMap, actualMap, label) {
  const mismatches = [];
  for (const [id, expected] of expectedMap.entries()) {
    const actual = actualMap.get(id);
    if (!actual) {
      mismatches.push(`${label} missing entry for ${id}`);
      continue;
    }
    if (stableStringify(sortObjectKeys(expected)) !== stableStringify(sortObjectKeys(actual))) {
      mismatches.push(`${label} field mismatch for ${id}`);
    }
  }
  for (const id of actualMap.keys()) {
    if (!expectedMap.has(id)) {
      mismatches.push(`${label} extra entry for ${id}`);
    }
  }
  return mismatches;
}

function ensureEqual(label, expected, actual, mismatches) {
  if (stableStringify(sortObjectKeys(expected)) !== stableStringify(sortObjectKeys(actual))) {
    mismatches.push(`${label} mismatch`);
  }
}

function loadFixtures() {
  if (!fs.existsSync(fixturesDir)) {
    return [];
  }
  return fs.readdirSync(fixturesDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => ({
      name,
      data: JSON.parse(fs.readFileSync(path.join(fixturesDir, name), "utf8"))
    }));
}

function validateFixtures(context) {
  const mismatches = [];
  for (const fixture of loadFixtures()) {
    const data = fixture.data;
    if (Array.isArray(data.expectedActions)) {
      for (const expectedAction of data.expectedActions) {
        const id = expectedAction.id;
        const manifestAction = context.manifestTSMap.get(id);
        const tsAction = context.tsMap.get(id);
        const swiftAction = context.swiftMap.get(id);
        if (!manifestAction || !tsAction || !swiftAction) {
          mismatches.push(`fixture ${fixture.name} missing aligned action ${id}`);
          continue;
        }
        ensureEqual(`fixture ${fixture.name} manifest action ${id}`, expectedAction.ts, manifestAction, mismatches);
        ensureEqual(`fixture ${fixture.name} TS action ${id}`, expectedAction.ts, tsAction, mismatches);
        ensureEqual(`fixture ${fixture.name} Swift action ${id}`, expectedAction.swift, swiftAction, mismatches);
      }
    }
    if (data.expectedDefaults) {
      ensureEqual(`fixture ${fixture.name} defaults`, data.expectedDefaults, context.defaultsGenerated.defaults, mismatches);
    }
  }
  return mismatches;
}

const swiftActionIdRegex = /public static let\s+\w+\s*=\s*"([^"]+)"/g;
const swiftActionIDs = [];
for (const match of swiftSource.matchAll(swiftActionIdRegex)) {
  const value = match[1];
  if (value.endsWith(".")) {
    continue;
  }
  swiftActionIDs.push(value);
}

const tsActionIDs = Array.isArray(tsGenerated.actionDefinitions)
  ? tsGenerated.actionDefinitions.map((item) => item.id)
  : [];
const swiftGeneratedActionIDs = Array.isArray(swiftGenerated.actionDefinitions)
  ? swiftGenerated.actionDefinitions.map((item) => item.id)
  : [];

const manifestSet = new Set(uniqueSorted(manifestArtifacts.actionIDs));
const swiftSet = new Set(uniqueSorted(swiftActionIDs));
const tsSet = new Set(uniqueSorted(tsActionIDs));
const swiftGeneratedSet = new Set(uniqueSorted(swiftGeneratedActionIDs));

const missingInTS = uniqueSorted(Array.from(manifestSet).filter((id) => !tsSet.has(id)));
const extraInTS = uniqueSorted(Array.from(tsSet).filter((id) => !manifestSet.has(id)));
const missingInSwift = uniqueSorted(Array.from(manifestSet).filter((id) => !swiftSet.has(id)));
const extraInSwift = uniqueSorted(Array.from(swiftSet).filter((id) => !manifestSet.has(id)));
const missingInSwiftGenerated = uniqueSorted(Array.from(manifestSet).filter((id) => !swiftGeneratedSet.has(id)));
const extraInSwiftGenerated = uniqueSorted(Array.from(swiftGeneratedSet).filter((id) => !manifestSet.has(id)));

const manifestTSMap = toMap(manifestArtifacts.tsActionDefinitions, "manifest TS action definitions");
const manifestSwiftMap = toMap(manifestArtifacts.swiftActionDefinitions, "manifest Swift action definitions");
const tsMap = toMap(tsGenerated.actionDefinitions, "generated TS action definitions");
const swiftMap = toMap(swiftGenerated.actionDefinitions, "generated Swift action definitions");
const manifestCategoryMap = toMap(manifestArtifacts.categories, "manifest categories", (item) => item.category);
const categoryMap = toMap(categoryGenerated.categories, "generated categories", (item) => item.category);

const fieldMismatches = [
  ...collectMismatches(manifestTSMap, tsMap, "TS action definitions"),
  ...collectMismatches(manifestSwiftMap, swiftMap, "Swift action definitions"),
  ...collectMismatches(manifestCategoryMap, categoryMap, "Category definitions")
];

ensureEqual("selectionKinds", manifestArtifacts.selectionKinds, defaultsGenerated.selectionKinds, fieldMismatches);
ensureEqual("toolOrder", manifestArtifacts.toolOrder, defaultsGenerated.toolOrder, fieldMismatches);
ensureEqual("defaults", manifestArtifacts.defaults, defaultsGenerated.defaults, fieldMismatches);
ensureEqual(
  "defaultCategorySettings",
  { categorySettings: manifestArtifacts.defaultCategorySettings },
  defaultCategorySettingsGenerated,
  fieldMismatches
);
ensureEqual(
  "defaultActionSettings",
  { actionSettings: manifestArtifacts.defaultActionSettings },
  defaultActionSettingsGenerated,
  fieldMismatches
);
if (!actionStatusFragmentGenerated.includes("| ID | Status | Category | Default Visible | Contexts | Required Tool |")) {
  fieldMismatches.push("action status fragment missing expected header");
}
for (const action of manifestArtifacts.tsActionDefinitions) {
  const row = `| ${action.id} | ${action.implementationStatus} | ${action.defaultCategory} | ${action.defaultVisible ? "yes" : "no"} | ${action.supportedContexts.join(", ")} | ${action.requiredTool ?? "-"} |`;
  if (!actionStatusFragmentGenerated.includes(row)) {
    fieldMismatches.push(`action status fragment missing row for ${action.id}`);
  }
}

const fixtureMismatches = validateFixtures({
  manifestTSMap,
  tsMap,
  swiftMap,
  defaultsGenerated
});

if (
  missingInTS.length === 0 &&
  extraInTS.length === 0 &&
  missingInSwift.length === 0 &&
  extraInSwift.length === 0 &&
  missingInSwiftGenerated.length === 0 &&
  extraInSwiftGenerated.length === 0 &&
  fieldMismatches.length === 0 &&
  fixtureMismatches.length === 0
) {
  console.log("Action registry parity OK (manifest ↔ generated TS/Swift definitions ↔ Swift ActionIDs)");
  process.exit(0);
}

if (missingInTS.length > 0) {
  console.error("Missing in Electron action definitions:");
  for (const id of missingInTS) {
    console.error(`  - ${id}`);
  }
}

if (extraInTS.length > 0) {
  console.error("Extra in Electron action definitions (not in manifest):");
  for (const id of extraInTS) {
    console.error(`  - ${id}`);
  }
}

if (missingInSwift.length > 0) {
  console.error("Missing in Swift ActionIDs:");
  for (const id of missingInSwift) {
    console.error(`  - ${id}`);
  }
}

if (extraInSwift.length > 0) {
  console.error("Extra in Swift ActionIDs (not in manifest):");
  for (const id of extraInSwift) {
    console.error(`  - ${id}`);
  }
}

if (missingInSwiftGenerated.length > 0) {
  console.error("Missing in generated Swift action definitions:");
  for (const id of missingInSwiftGenerated) {
    console.error(`  - ${id}`);
  }
}

if (extraInSwiftGenerated.length > 0) {
  console.error("Extra in generated Swift action definitions (not in manifest):");
  for (const id of extraInSwiftGenerated) {
    console.error(`  - ${id}`);
  }
}

if (fieldMismatches.length > 0) {
  console.error("Field-level parity mismatches:");
  for (const mismatch of fieldMismatches) {
    console.error(`  - ${mismatch}`);
  }
}

if (fixtureMismatches.length > 0) {
  console.error("Fixture mismatches:");
  for (const mismatch of fixtureMismatches) {
    console.error(`  - ${mismatch}`);
  }
}

process.exit(1);
