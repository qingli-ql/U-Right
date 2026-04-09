#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const defaultFixturesDir = path.join(repoRoot, "tests", "fixtures", "settings-migration");

function fail(message) {
  throw new Error(message);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getValueAtPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, segment) => {
    if (current == null) {
      return undefined;
    }
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      return current[Number(segment)];
    }
    return current[segment];
  }, value);
}

function validateSettingsShape(settings, fixture, label) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    fail(`${label} must be an object`);
  }

  for (const key of fixture.forbiddenTopLevelKeys) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      fail(`${label} still contains forbidden top-level key: ${key}`);
    }
  }

  for (const dottedPath of fixture.requiredPaths) {
    if (getValueAtPath(settings, dottedPath) === undefined) {
      fail(`${label} is missing required path: ${dottedPath}`);
    }
  }

  for (const [dottedPath, expectedValue] of Object.entries(fixture.expectedValues)) {
    const actualValue = getValueAtPath(settings, dottedPath);
    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      fail(`${label} mismatch at ${dottedPath}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
    }
  }
}

function validateFixtureShape(fixturePath, fixture) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    fail(`Fixture ${fixturePath} must be an object`);
  }
  if (!fixture.name || typeof fixture.name !== "string") {
    fail(`Fixture ${fixturePath} is missing name`);
  }
  if (typeof fixture.sourceVersion !== "number") {
    fail(`Fixture ${fixturePath} is missing numeric sourceVersion`);
  }
  if (typeof fixture.expectedDocumentVersion !== "number") {
    fail(`Fixture ${fixturePath} is missing numeric expectedDocumentVersion`);
  }
  if (!Array.isArray(fixture.forbiddenTopLevelKeys) || fixture.forbiddenTopLevelKeys.length === 0) {
    fail(`Fixture ${fixturePath} must declare forbiddenTopLevelKeys`);
  }
  if (!Array.isArray(fixture.requiredPaths) || fixture.requiredPaths.length === 0) {
    fail(`Fixture ${fixturePath} must declare requiredPaths`);
  }
  if (!fixture.expectedValues || typeof fixture.expectedValues !== "object" || Array.isArray(fixture.expectedValues)) {
    fail(`Fixture ${fixturePath} must declare expectedValues`);
  }
  if (!fixture.legacySettings || typeof fixture.legacySettings !== "object" || Array.isArray(fixture.legacySettings)) {
    fail(`Fixture ${fixturePath} must declare legacySettings`);
  }
  if (!fixture.sampleMigratedSettings || typeof fixture.sampleMigratedSettings !== "object" || Array.isArray(fixture.sampleMigratedSettings)) {
    fail(`Fixture ${fixturePath} must declare sampleMigratedSettings`);
  }

  const hasLegacyMirrorField = fixture.forbiddenTopLevelKeys.some((key) => Object.prototype.hasOwnProperty.call(fixture.legacySettings, key));
  if (!hasLegacyMirrorField) {
    fail(`Fixture ${fixturePath} must exercise at least one forbidden legacy mirror field`);
  }

  validateSettingsShape(fixture.sampleMigratedSettings, fixture, `${fixture.name} sampleMigratedSettings`);
}

function loadFixtures(targetPath) {
  if (!targetPath) {
    return fs.readdirSync(defaultFixturesDir)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => path.join(defaultFixturesDir, name));
  }

  const absolutePath = path.resolve(targetPath);
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    return fs.readdirSync(absolutePath)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => path.join(absolutePath, name));
  }
  return [absolutePath];
}

function parseArgs(argv) {
  const args = {
    fixturesPath: null,
    compiledStorePath: null,
    candidateFilePath: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--compiled-store") {
      args.compiledStorePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--candidate-file") {
      args.candidateFilePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (!args.fixturesPath) {
      args.fixturesPath = token;
      continue;
    }
    fail(`Unknown extra argument: ${token}`);
  }

  return args;
}

function runCompiledStoreValidation(fixturePath, fixture, compiledStorePath) {
  const absoluteStorePath = path.resolve(compiledStorePath);
  if (!fs.existsSync(absoluteStorePath)) {
    fail(`Compiled store module not found: ${absoluteStorePath}`);
  }
  const compiledStore = require(absoluteStorePath);
  const migrate = typeof compiledStore.migrateStoredSettingsToV3 === "function"
    ? compiledStore.migrateStoredSettingsToV3
    : null;
  const normalize = typeof compiledStore.normalizeSettings === "function"
    ? compiledStore.normalizeSettings
    : null;

  if (!migrate && !normalize) {
    fail(`Compiled store module must export migrateStoredSettingsToV3() or normalizeSettings(): ${absoluteStorePath}`);
  }

  const migrated = migrate
    ? migrate(fixture.legacySettings, fixture.sourceVersion)
    : normalize(fixture.legacySettings, fixture.sourceVersion);
  if (!migrated) {
    fail(`${fixture.name} compiled store migration returned no settings`);
  }
  validateSettingsShape(migrated, fixture, `${fixture.name} migrated settings`);
}

function runCandidateFileValidation(fixturePath, fixture, candidateFilePath) {
  const absoluteCandidatePath = path.resolve(candidateFilePath);
  if (!fs.existsSync(absoluteCandidatePath)) {
    fail(`Candidate settings file not found: ${absoluteCandidatePath}`);
  }
  const candidate = loadJson(absoluteCandidatePath);
  const settings = candidate && typeof candidate === "object" && candidate.settings ? candidate.settings : candidate;
  const version = candidate && typeof candidate === "object" && typeof candidate.version === "number" ? candidate.version : null;

  if (version !== fixture.expectedDocumentVersion) {
    fail(`${fixture.name} candidate document version mismatch: expected ${fixture.expectedDocumentVersion}, got ${JSON.stringify(version)}`);
  }
  validateSettingsShape(settings, fixture, `${fixture.name} candidate settings`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixturePaths = loadFixtures(args.fixturesPath);
  if (fixturePaths.length === 0) {
    fail("No settings migration fixtures found");
  }

  for (const fixturePath of fixturePaths) {
    const fixture = loadJson(fixturePath);
    validateFixtureShape(fixturePath, fixture);

    if (args.compiledStorePath) {
      runCompiledStoreValidation(fixturePath, fixture, args.compiledStorePath);
    }

    if (args.candidateFilePath) {
      runCandidateFileValidation(fixturePath, fixture, args.candidateFilePath);
    }
  }

  if (args.compiledStorePath) {
    console.log(`Settings migration validation OK (${fixturePaths.length} fixture(s), compiled store mode)`);
    return;
  }
  if (args.candidateFilePath) {
    console.log(`Settings migration validation OK (${fixturePaths.length} fixture(s), candidate file mode)`);
    return;
  }
  console.log(`Settings migration fixtures OK (${fixturePaths.length} fixture(s))`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
