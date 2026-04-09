#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function fail(message) {
  throw new Error(message);
}

function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value).sort(), 2);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const fixtureDir = path.join(repoRoot, "tests", "fixtures", "action-handoff");
  const decoderPath = path.join(repoRoot, "electron", "dist", "main", "main", "application", "requests", "request-wire.js");
  if (!fs.existsSync(decoderPath)) {
    fail(`Compiled request wire module not found: ${decoderPath}`);
  }
  const { decodeActionRequestWire } = require(decoderPath);
  if (typeof decodeActionRequestWire !== "function") {
    fail("Compiled request wire module must export decodeActionRequestWire()");
  }

  for (const fixtureName of ["canonical-folder.json", "canonical-file.json"]) {
    const mode = fixtureName.includes("folder") ? "folder" : "file";
    const emitted = execFileSync("swift", ["run", "ActionHandoffFixtureEmitter", mode], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    const emittedJson = JSON.parse(emitted);
    const fixtureJson = loadJson(path.join(fixtureDir, fixtureName));
    if (JSON.stringify(emittedJson) !== JSON.stringify(fixtureJson)) {
      fail(`Swift-emitted handoff fixture does not match ${fixtureName}`);
    }
    const decoded = decodeActionRequestWire(emittedJson);
    if (decoded.actionID !== fixtureJson.actionID) {
      fail(`Decoded actionID mismatch for ${fixtureName}`);
    }
  }

  const invalidCreatedAt = loadJson(path.join(fixtureDir, "invalid-created-at-number.json"));
  try {
    decodeActionRequestWire(invalidCreatedAt);
    fail("numeric createdAt fixture should fail decoding");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("createdAt")) {
      fail(`numeric createdAt fixture failed with unexpected message: ${message}`);
    }
  }

  const invalidFileURL = loadJson(path.join(fixtureDir, "invalid-file-url.json"));
  try {
    decodeActionRequestWire(invalidFileURL);
    fail("file URL fixture should fail decoding");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("POSIX path")) {
      fail(`file URL fixture failed with unexpected message: ${message}`);
    }
  }

  console.log("Action handoff contract validation OK (swift fixture emitter, canonical fixtures, strict decoder, negative cases)");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
