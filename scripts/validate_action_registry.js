#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const swiftPath = path.join(repoRoot, "Sources", "URightShared", "Generated", "ActionIDs.generated.swift");
const tsPath = path.join(repoRoot, "electron", "src", "shared", "action-registry.ts");

const swiftSource = fs.readFileSync(swiftPath, "utf8");
const tsSource = fs.readFileSync(tsPath, "utf8");

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
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

const tsActionIdRegex = /\{\s*id:\s*"([^"]+)"/g;
const tsActionIDs = [];
for (const match of tsSource.matchAll(tsActionIdRegex)) {
  tsActionIDs.push(match[1]);
}

const tsAllowedOnly = new Set([
  "submenu.templates",
  "submenu.scripts"
]);

const swiftSet = new Set(uniqueSorted(swiftActionIDs));
const tsSet = new Set(uniqueSorted(tsActionIDs));

const missingInTS = uniqueSorted(
  Array.from(swiftSet).filter((id) => !tsSet.has(id))
);

const extraInTS = uniqueSorted(
  Array.from(tsSet).filter((id) => !swiftSet.has(id) && !tsAllowedOnly.has(id))
);

if (missingInTS.length === 0 && extraInTS.length === 0) {
  console.log("Action registry parity OK (Swift ActionIDs ↔ Electron action definitions)");
  process.exit(0);
}

if (missingInTS.length > 0) {
  console.error("Missing in Electron action definitions:");
  for (const id of missingInTS) {
    console.error(`  - ${id}`);
  }
}

if (extraInTS.length > 0) {
  console.error("Missing in Swift ActionIDs:");
  for (const id of extraInTS) {
    console.error(`  - ${id}`);
  }
}

process.exit(1);
