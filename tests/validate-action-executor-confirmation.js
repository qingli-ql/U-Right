#!/usr/bin/env node
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const esbuild = require("esbuild");

const workspaceRoot = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "uright-action-executor-confirm-"));
const bundlePath = path.join(tempRoot, "confirmation-bundle.mjs");
const entryPath = path.join(tempRoot, "confirmation-entry.ts");

const source = `
  import fs from "node:fs";
  import os from "node:os";
  import path from "node:path";
  import { createDefaultSettings } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/contracts/defaults.ts"))};
  import { ActionExecutor, createDirectActionCommand } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/main/application/actions/action-executor.ts"))};
  import { FILE_HANDLERS } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/main/application/actions/commands/file.ts"))};

  function createController() {
    return {
      openSettings() { throw new Error("unused"); },
      openLogs() { throw new Error("unused"); },
      openOnboarding() { throw new Error("unused"); },
      async openPrompt() { return null; },
      openResult() { return { isDestroyed: () => false, webContents: { isDestroyed: () => false, send() {} } }; },
      appendResult() {},
      updateResult() {},
      getWindowContext() { return undefined; },
      submitPrompt() {}
    };
  }

  function makeRequest(actionID, selectedURLs) {
    return {
      id: "confirmation-test",
      actionID,
      createdAt: new Date().toISOString(),
      context: {
        selectedURLs,
        primaryURL: selectedURLs[0] ?? null,
        currentDirectoryURL: path.dirname(selectedURLs[0] ?? os.tmpdir()),
        resolvedTargetDirectory: path.dirname(selectedURLs[0] ?? os.tmpdir()),
        resolvedPrimaryTarget: selectedURLs[0] ?? null,
        resolvedSelectionDirectory: path.dirname(selectedURLs[0] ?? os.tmpdir()),
        selectionKind: selectedURLs.length > 1 ? "multi" : "file",
        detectedTools: {},
        fileMetadata: []
      }
    };
  }

  export async function run() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "uright-trash-fixture-"));
    const targetA = path.join(root, "a.txt");
    const targetB = path.join(root, "b.txt");
    fs.writeFileSync(targetA, "a", "utf8");
    fs.writeFileSync(targetB, "b", "utf8");

    const settings = createDefaultSettings();
    const controller = createController();
    const state = globalThis.__URIGHT_ELECTRON_MOCK__;
    const confirmations = [];

    const fileTrashCommand = FILE_HANDLERS["file.trash"];
    if (typeof fileTrashCommand !== "function") {
      throw new Error("file.trash handler is missing");
    }

    const executeWithConfirm = async (allow) => {
      const executor = new ActionExecutor({
        commands: [createDirectActionCommand("file.trash", fileTrashCommand)],
        resolveActionTitle: (id) => id,
        confirmationPolicy: {
          async confirm(options) {
            confirmations.push(options);
            return allow;
          }
        },
        async presentUnknownAction(actionID) {
          throw new Error("Unexpected unknown action: " + actionID);
        }
      });
      await executor.execute({
        request: makeRequest("file.trash", [targetA, targetB]),
        controller,
        settings,
        scriptsDirectory: root
      });
    };

    await executeWithConfirm(false);
    if (confirmations.length !== 1) {
      throw new Error("Expected confirmation policy to be called exactly once when canceled");
    }
    if (state.trashed.length !== 0) {
      throw new Error("Targets should not be trashed when confirmation policy rejects");
    }

    await executeWithConfirm(true);
    if (confirmations.length !== 2) {
      throw new Error("Expected confirmation policy to be called again when approved");
    }
    if (state.trashed.length !== 2) {
      throw new Error("Targets were not trashed after confirmation approval");
    }

    return { root, trashed: state.trashed.slice() };
  }
`;

fs.writeFileSync(entryPath, source, "utf8");

const electronStubPlugin = {
  name: "uright-electron-stub",
  setup(build) {
    build.onResolve({ filter: /^electron$/ }, () => ({ path: "electron-stub", namespace: "uright-stub" }));
    build.onLoad({ filter: /.*/, namespace: "uright-stub" }, () => ({
      contents: `
        const state = globalThis.__URIGHT_ELECTRON_MOCK__ ??= {
          trashed: [],
          revealed: [],
          dialogs: []
        };
        export const clipboard = { writeText() {} };
        export const dialog = { async showMessageBox(options) { state.dialogs.push(options); return { response: 0 }; } };
        export const shell = {
          showItemInFolder(target) { state.revealed.push(String(target)); },
          async trashItem(target) { state.trashed.push(String(target)); }
        };
        export const app = { getPath() { return process.cwd(); } };
      `,
      loader: "js"
    }));
  }
};

async function main() {
  await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile: bundlePath,
    logLevel: "silent",
    plugins: [electronStubPlugin]
  });

  const bundle = await import(pathToFileURL(bundlePath).href);
  const result = await bundle.run();
  console.log(`Action executor confirmation boundary OK (trashed=${result.trashed.join(", ")})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
