#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const esbuild = require("esbuild");

const workspaceRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

function assertNoProjectionImport(relativePath) {
  const source = read(relativePath);
  assert.ok(
    !source.includes("settings-editor-projections"),
    `${relativePath} must not import settings-editor-projections`
  );
}

async function validateSelectorRuntime() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "uright-renderer-selector-owner-"));
  const entryPath = path.join(tempRoot, "selector-owner-entry.ts");
  const bundlePath = path.join(tempRoot, "selector-owner-bundle.cjs");

  fs.writeFileSync(entryPath, `
    import assert from "node:assert/strict";
    import { createDefaultSettings } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/contracts/defaults.ts"))};
    import { selectContextMenuWorkbenchViewModel } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/renderer/features/settings/model/settings-editor-selectors.ts"))};

    const settings = createDefaultSettings();
    const viewModel = selectContextMenuWorkbenchViewModel(
      {
        settings,
        section: "context-menu",
        selectedCategory: "open",
        selectedMenuActionID: "missing.action",
        selectedTemplateID: null,
        selectedOpenActionID: null,
        dragState: {
          draggedCategory: null,
          draggedActionID: null,
          dragHoverCategory: null,
          dragHoverActionID: null
        }
      },
      {
        terminal: {
          kind: "terminal",
          isInstalled: true
        }
      },
      {
        appGroupIdentifier: "group.dev",
        sharedRoot: "/tmp/group.dev",
        settingsFile: "/tmp/group.dev/settings.json",
        settingsVersion: 3,
        errors: [],
        finderMenuSnapshot: {
          updatedAt: new Date(0).toISOString(),
          appGroupIdentifier: "group.dev",
          settingsVersion: 3,
          context: {
            selectedURLs: ["/tmp/project"],
            primaryURL: "/tmp/project",
            currentDirectoryURL: "/tmp",
            resolvedTargetDirectory: "/tmp/project",
            resolvedPrimaryTarget: "/tmp/project",
            resolvedSelectionDirectory: "/tmp/project",
            selectionKind: "folder",
            detectedTools: {
              terminal: {
                kind: "terminal",
                isInstalled: true
              }
            },
            fileMetadata: [],
            capabilities: {
              hasWorkingDirectory: true,
              hasWritableTarget: true,
              scriptNames: []
            }
          },
          menu: [
            {
              id: "open.terminal",
              title: "Open in Terminal",
              isEnabled: true,
              children: []
            },
            {
              id: "ghost.action",
              title: "Ghost Action",
              isEnabled: true,
              children: []
            }
          ],
          availability: []
        }
      }
    );

    assert.equal(viewModel.selectedCategory, "open");
    assert.ok(viewModel.categoryActions.some((item) => item.actionID === "open.terminal"), "open inspector items should come from selector owner");
    assert.equal(
      viewModel.enabledActionCount,
      viewModel.categoryActions.filter((item) => item.settingEnabled).length,
      "enabledActionCount should stay aligned with selector-owned inspector items"
    );
    assert.ok(
      viewModel.finderSnapshotDiff.includes("Only in actual menu: ghost.action"),
      "selector snapshot diff should flag unknown actual actions"
    );
    assert.ok(
      viewModel.finderSnapshotDiff.some((item) => item.startsWith("Configured but missing in actual menu:")),
      "selector snapshot diff should flag configured-but-missing actions"
    );
    assert.equal(
      viewModel.selectedMenuAction?.actionID,
      viewModel.categoryActions[0]?.actionID ?? null,
      "selector should normalize invalid selected action ids"
    );
  `, "utf8");

  await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node20",
    absWorkingDir: workspaceRoot,
    nodePaths: [path.join(workspaceRoot, "node_modules")],
    outfile: bundlePath,
    logLevel: "silent"
  });

  require(bundlePath);
}

async function main() {
  assertNoProjectionImport("electron/src/renderer/features/settings/model/settings-editor-selectors.ts");
  assertNoProjectionImport("electron/src/renderer/hooks/use-context-menu-workbench.ts");
  assertNoProjectionImport("electron/src/renderer/features/settings/context-menu-workbench.tsx");
  assert.ok(
    !read("electron/src/renderer/features/settings/settings-screen.tsx").includes("../../hooks/use-context-menu-workbench"),
    "settings-screen.tsx must stop importing the legacy workbench hook on the primary path"
  );

  await validateSelectorRuntime();
  console.log("Renderer selector owner validation OK");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
