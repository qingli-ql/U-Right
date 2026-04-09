#!/usr/bin/env node

const path = require("node:path");
const {
  generatedDir,
  electronGeneratedModulePath,
  readManifestDocument,
  buildArtifacts,
  swiftGeneratedCatalogPath,
  writeJsonFile,
  writeTextFile,
  renderSwiftCatalogSource,
  renderElectronManifestModuleSource,
  renderActionStatusFragment
} = require("../lib/action-manifest-support");

const manifest = readManifestDocument();
const artifacts = buildArtifacts(manifest);

writeJsonFile(path.join(generatedDir, "action-ids.json"), {
  actionIDs: artifacts.actionIDs,
  swiftActionIDConstants: artifacts.swiftActionIDConstants
});
writeJsonFile(path.join(generatedDir, "category-definitions.json"), {
  categories: artifacts.categories
});
writeJsonFile(path.join(generatedDir, "defaults.json"), {
  selectionKinds: artifacts.selectionKinds,
  toolOrder: artifacts.toolOrder,
  defaults: artifacts.defaults
});
writeJsonFile(path.join(generatedDir, "default-category-settings.json"), {
  categorySettings: artifacts.defaultCategorySettings
});
writeJsonFile(path.join(generatedDir, "default-action-settings.json"), {
  actionSettings: artifacts.defaultActionSettings
});
writeJsonFile(path.join(generatedDir, "ts-action-definitions.json"), {
  actionDefinitions: artifacts.tsActionDefinitions
});
writeJsonFile(path.join(generatedDir, "swift-action-definitions.json"), {
  actionDefinitions: artifacts.swiftActionDefinitions
});
writeTextFile(electronGeneratedModulePath, renderElectronManifestModuleSource(artifacts));
writeTextFile(swiftGeneratedCatalogPath, renderSwiftCatalogSource(artifacts));
writeTextFile(path.join(generatedDir, "action-status-fragment.md"), renderActionStatusFragment(artifacts));

console.log(`Generated manifest artifacts under ${path.relative(process.cwd(), generatedDir)}`);
