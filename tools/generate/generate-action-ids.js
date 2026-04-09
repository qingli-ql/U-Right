#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { repoRoot, readManifestDocument, buildArtifacts } = require("../lib/action-manifest-support");

const swiftOutputDir = path.join(repoRoot, "Sources", "URightShared", "Generated");
const swiftOutputPath = path.join(swiftOutputDir, "ActionIDs.generated.swift");
const artifacts = buildArtifacts(readManifestDocument());
const lines = artifacts.swiftActionIDConstants.map(({ name, id }) => `    public static let ${name} = "${id}"`);

const output = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Source of truth: manifest/actions.json

import Foundation

public enum ActionIDs {
    public static let newFromTemplatePrefix = "create.template."
    public static let scriptRunPrefix = "script.run."
    public static let openCustomPrefix = "open.custom."
${lines.join("\n")}
}
`;

fs.mkdirSync(swiftOutputDir, { recursive: true });
fs.writeFileSync(swiftOutputPath, output, "utf8");
console.log(`Generated ${path.relative(repoRoot, swiftOutputPath)} with ${artifacts.actionIDs.length} action IDs.`);
