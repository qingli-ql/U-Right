#!/usr/bin/env node
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const esbuild = require("esbuild");

const workspaceRoot = path.resolve(__dirname, "..", "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "uright-action-smoke-"));
const bundlePath = path.join(tempRoot, "dispatch-smoke-bundle.mjs");
const entryPath = path.join(tempRoot, "dispatch-smoke-entry.ts");

const source = `
  import fs from "node:fs";
  import os from "node:os";
  import path from "node:path";
  import { dispatchActionRequest } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/main/application/actions/dispatcher.ts"))};
  import { createDefaultSettings } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/contracts/defaults.ts"))};

  function createController(promptValue = "Generated Folder") {
    const resultPayloads = [];
    const resultChunks = [];
    const resultUpdates = [];
    return {
      resultPayloads,
      resultChunks,
      resultUpdates,
      openSettings() { throw new Error("openSettings should not be called in smoke test"); },
      openLogs() { throw new Error("openLogs should not be called in smoke test"); },
      openOnboarding() { throw new Error("openOnboarding should not be called in smoke test"); },
      async openPrompt() { return promptValue; },
      openResult(payload) {
        resultPayloads.push(payload);
        return {
          isDestroyed: () => false,
          webContents: {
            id: 1,
            isDestroyed: () => false,
            send: () => {}
          }
        };
      },
      appendResult(_window, chunk) {
        resultChunks.push(String(chunk));
      },
      updateResult(_window, payload) {
        resultUpdates.push(payload);
      },
      getWindowContext() { return undefined; },
      submitPrompt() {}
    };
  }

  function makeRequest(actionID, options) {
    const targetPath = options.targetPath;
    const selectionKind = options.selectionKind ?? "folder";
    const directoryPath = options.directoryPath ?? (selectionKind === "file" ? path.dirname(targetPath) : targetPath);
    return {
      id: actionID + "-request",
      actionID,
      createdAt: new Date().toISOString(),
      context: {
        selectedURLs: [targetPath],
        primaryURL: targetPath,
        currentDirectoryURL: directoryPath,
        resolvedTargetDirectory: directoryPath,
        resolvedPrimaryTarget: targetPath,
        resolvedSelectionDirectory: directoryPath,
        selectionKind,
        detectedTools: {},
        fileMetadata: []
      }
    };
  }

  export async function run() {
    const smokeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "uright-dispatch-fixture-"));
    const smokeHome = path.join(smokeRoot, "home");
    process.env.HOME = smokeHome;
    process.env.APP_GROUP_IDENTIFIER = "group.com.openai.uright.smoke";
    const state = globalThis.__URIGHT_ELECTRON_MOCK__ ?? {};
    const settings = createDefaultSettings();
    settings.ai.enabled = true;
    settings.customActions.openActions = [
      {
        id: "smoke-app",
        name: "Smoke App",
        appPath: "/Applications/SmokeApp.app",
        bundleIdentifier: null,
        targetKind: "any",
        isEnabled: true,
        sortOrder: 1,
        category: "open"
      }
    ];

    const clipboardController = createController();
    await dispatchActionRequest(
      makeRequest("copy.path", { targetPath: smokeRoot, selectionKind: "folder" }),
      clipboardController,
      settings,
      smokeRoot
    );
    if (state.clipboardText !== smokeRoot) {
      throw new Error("copy.path did not write expected clipboard text");
    }

    const createControllerResult = createController("Generated Folder");
    await dispatchActionRequest(
      makeRequest("create.new-folder", { targetPath: smokeRoot, selectionKind: "folder" }),
      createControllerResult,
      settings,
      smokeRoot
    );
    const createdFolder = path.join(smokeRoot, "Generated Folder");
    if (!fs.existsSync(createdFolder) || !fs.statSync(createdFolder).isDirectory()) {
      throw new Error("create.new-folder did not create the requested folder");
    }

    const spawnCountBeforeOpen = state.spawns.length;
    state.detectedTools = {
      vscode: { kind: "vscode", isInstalled: true, executablePath: "/mock/bin/code" }
    };
    await dispatchActionRequest(
      makeRequest("open.vscode", { targetPath: smokeRoot, selectionKind: "folder" }),
      createController(),
      settings,
      smokeRoot
    );
    const openSpawn = state.spawns[spawnCountBeforeOpen];
    if (!openSpawn || openSpawn.command !== "/mock/bin/code" || openSpawn.args[0] !== smokeRoot) {
      throw new Error("open.vscode did not spawn mocked vscode executable with target path");
    }

    const originalFile = path.join(smokeRoot, "old-name.txt");
    fs.writeFileSync(originalFile, "hello", "utf8");
    await dispatchActionRequest(
      makeRequest("file.rename", { targetPath: originalFile, selectionKind: "file", directoryPath: smokeRoot }),
      createController("renamed.txt"),
      settings,
      smokeRoot
    );
    const renamedFile = path.join(smokeRoot, "renamed.txt");
    if (!fs.existsSync(renamedFile)) {
      throw new Error("file.rename did not rename target file");
    }

    const jsonFile = path.join(smokeRoot, "ugly.json");
    fs.writeFileSync(jsonFile, '{"hello":1}', "utf8");
    await dispatchActionRequest(
      makeRequest("file.json-format", { targetPath: jsonFile, selectionKind: "file", directoryPath: smokeRoot }),
      createController(),
      settings,
      smokeRoot
    );
    const formatted = fs.readFileSync(jsonFile, "utf8");
    if (!formatted.includes("\\n  \\"hello\\": 1\\n")) {
      throw new Error("file.json-format did not rewrite JSON with formatted indentation");
    }

    const refreshCountBefore = state.refreshCalls.length;
    await dispatchActionRequest(
      makeRequest("view.refresh", { targetPath: smokeRoot, selectionKind: "folder" }),
      createController(),
      settings,
      smokeRoot
    );
    if (state.refreshCalls.length !== refreshCountBefore + 1) {
      throw new Error("view.refresh did not call finder refresh bridge");
    }

    const toggleCountBefore = state.toggleCalls.length;
    await dispatchActionRequest(
      makeRequest("view.toggle-hidden", { targetPath: smokeRoot, selectionKind: "folder" }),
      createController(),
      settings,
      smokeRoot
    );
    if (state.toggleCalls.length !== toggleCountBefore + 1) {
      throw new Error("view.toggle-hidden did not call finder hidden-files bridge");
    }

    const spawnCountBeforeGit = state.spawns.length;
    const gitController = createController();
    await dispatchActionRequest(
      makeRequest("git.status", { targetPath: smokeRoot, selectionKind: "folder" }),
      gitController,
      settings,
      smokeRoot
    );
    const gitSpawn = state.spawns[spawnCountBeforeGit];
    if (!gitSpawn || gitSpawn.command !== "/usr/bin/env" || gitSpawn.args.join(" ") !== "git status --short --branch") {
      throw new Error("git.status did not spawn expected git command");
    }
    if (!gitController.resultPayloads.some((payload) => payload.title === "Git Status")) {
      throw new Error("git.status did not open result window with Git Status title");
    }

    const dynamicFile = path.join(smokeRoot, "README.md");
    await dispatchActionRequest(
      makeRequest("create.template.markdown", { targetPath: smokeRoot, selectionKind: "folder" }),
      createController(),
      settings,
      smokeRoot
    );
    if (!fs.existsSync(dynamicFile) || !fs.readFileSync(dynamicFile, "utf8").startsWith("# Title")) {
      throw new Error("create.template.markdown did not create expected template file");
    }
    if (!state.revealed.includes(dynamicFile)) {
      throw new Error("create.template.markdown did not reveal created file");
    }

    const spawnCountBeforeCustom = state.spawns.length;
    await dispatchActionRequest(
      makeRequest("open.custom.smoke-app", { targetPath: smokeRoot, selectionKind: "folder" }),
      createController(),
      settings,
      smokeRoot
    );
    const customSpawn = state.spawns[spawnCountBeforeCustom];
    if (!customSpawn || customSpawn.command !== "/usr/bin/open" || !customSpawn.args.includes("/Applications/SmokeApp.app")) {
      throw new Error("open.custom.smoke-app did not invoke open -a with configured app path");
    }

    const aiController = createController("Explain this folder");
    state.detectedTools = {};
    await dispatchActionRequest(
      makeRequest("ai.ask-codex", { targetPath: smokeRoot, selectionKind: "folder" }),
      aiController,
      settings,
      smokeRoot
    );
    if (aiController.resultPayloads.length !== 1) {
      throw new Error("ai.ask-codex did not open a result window");
    }
    if (!aiController.resultUpdates.some((item) => item.status === "failed")) {
      throw new Error("ai.ask-codex without CLI did not surface failed status");
    }
    if (!aiController.resultChunks.some((chunk) => chunk.includes("CLI 不可用"))) {
      throw new Error("ai.ask-codex without CLI did not append missing CLI message");
    }

    const fallbackController = createController();
    await dispatchActionRequest(
      makeRequest("unknown.action", { targetPath: smokeRoot, selectionKind: "folder" }),
      fallbackController,
      settings,
      smokeRoot
    );
    if (!state.dialogs.some((item) => String(item.message).includes("尚未实现"))) {
      throw new Error("unknown action did not trigger fallback dialog");
    }

    return {
      smokeRoot,
      tests: [
        "copy.path",
        "create.new-folder",
        "open.vscode",
        "file.rename",
        "file.json-format",
        "view.refresh",
        "view.toggle-hidden",
        "git.status",
        "create.template.markdown",
        "open.custom.smoke-app",
        "ai.ask-codex missing CLI",
        "unknown action fallback"
      ]
    };
  }
`;

fs.writeFileSync(entryPath, source, "utf8");

const electronStubPlugin = {
  name: "uright-electron-stub",
  setup(build) {
    build.onResolve({ filter: /^electron$/ }, () => ({ path: "electron-stub", namespace: "uright-stub" }));
    build.onResolve({ filter: /^node:child_process$/ }, () => ({ path: "child-process-stub", namespace: "uright-stub" }));
    build.onResolve({ filter: /tool-detection$/ }, () => ({ path: "tool-detection-stub", namespace: "uright-stub" }));
    build.onResolve({ filter: /view-actions$/ }, () => ({ path: "view-actions-stub", namespace: "uright-stub" }));
    build.onResolve({ filter: /\/store$/ }, () => ({ path: "store-stub", namespace: "uright-stub" }));
    build.onLoad({ filter: /.*/, namespace: "uright-stub" }, (args) => {
      if (args.path === "electron-stub") {
        return {
          contents: `
            const state = globalThis.__URIGHT_ELECTRON_MOCK__ ??= {
              clipboardText: "",
              dialogs: [],
              revealed: [],
              trashed: [],
              appPaths: [],
              spawns: [],
              execs: [],
              refreshCalls: [],
              toggleCalls: [],
              detectedTools: {}
            };
            export const clipboard = { writeText(value) { state.clipboardText = String(value); } };
            export const dialog = { async showMessageBox(options) { state.dialogs.push(options); return { response: 0 }; } };
            export const shell = {
              showItemInFolder(target) { state.revealed.push(String(target)); },
              async trashItem(target) { state.trashed.push(String(target)); }
            };
            export const app = { getPath(name) { state.appPaths.push(name); return process.cwd(); } };
          `,
          loader: "js"
        };
      }
      if (args.path === "child-process-stub") {
        return {
          contents: `
            const state = globalThis.__URIGHT_ELECTRON_MOCK__ ??= { spawns: [], execs: [] };
            function makeChild() {
              return {
                stdout: { on() {} },
                stderr: { on() {} },
                on() {},
                unref() {}
              };
            }
            export function spawn(command, args = [], options = {}) {
              state.spawns.push({ command: String(command), args: Array.isArray(args) ? args.map(String) : [], cwd: options.cwd ?? null });
              return makeChild();
            }
            export function execFileSync(command, args = [], options = {}) {
              state.execs.push({ command: String(command), args: Array.isArray(args) ? args.map(String) : [], cwd: options.cwd ?? null });
              return Buffer.from("");
            }
          `,
          loader: "js"
        };
      }
      if (args.path === "tool-detection-stub") {
        return {
          contents: `
            export function detectTools() {
              const state = globalThis.__URIGHT_ELECTRON_MOCK__ ??= { detectedTools: {} };
              return state.detectedTools ?? {};
            }
          `,
          loader: "js"
        };
      }
      if (args.path === "view-actions-stub") {
        return {
          contents: `
            const state = globalThis.__URIGHT_ELECTRON_MOCK__ ??= { refreshCalls: [], toggleCalls: [] };
            export async function refreshFinderWindows(payload) {
              state.refreshCalls.push(payload ?? null);
              return { ok: true, message: "stub refresh" };
            }
            export async function toggleFinderHiddenFiles(payload) {
              state.toggleCalls.push(payload ?? null);
              return { ok: true, message: "stub hidden toggle" };
            }
          `,
          loader: "js"
        };
      }
      if (args.path === "store-stub") {
        return {
          contents: `
            let saved = null;
            export function saveSettings(settings) { saved = settings; return settings; }
            export function getSavedSettings() { return saved; }
          `,
          loader: "js"
        };
      }
      return null;
    });
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
  console.log(`Action dispatch smoke OK (${result.tests.join(", ")})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
