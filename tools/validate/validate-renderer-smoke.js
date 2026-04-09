#!/usr/bin/env node
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const esbuild = require("esbuild");

const workspaceRoot = path.resolve(__dirname, "..", "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "uright-renderer-smoke-"));
const entryPath = path.join(tempRoot, "renderer-smoke-entry.tsx");
const bundlePath = path.join(tempRoot, "renderer-smoke-bundle.cjs");

const source = `
  import React from "react";
  import { renderToStaticMarkup } from "react-dom/server";
  import { AppRouter } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/renderer/windows/app-router.tsx"))};
  import { SettingsSidebar } from ${JSON.stringify(path.join(workspaceRoot, "electron/src/renderer/components/settings-sidebar.tsx"))};

  export async function run() {
    const routerMarkup = renderToStaticMarkup(
      React.createElement(AppRouter, {
        renderSettings: () => React.createElement("div", null, "settings view")
      })
    );
    if (!routerMarkup.includes("Loading U-Right")) {
      throw new Error("AppRouter did not render loading shell during initial state");
    }

    const sidebarMarkup = renderToStaticMarkup(
      React.createElement(SettingsSidebar, {
        section: "tools",
        onSectionChange: () => {},
        showSaveNotice: true,
        saveState: "saved",
        canRestore: true,
        disableRestore: false,
        onRestore: () => {}
      })
    );
    if (!sidebarMarkup.includes("Tools")) {
      throw new Error("SettingsSidebar did not render Tools section");
    }
    if (!sidebarMarkup.includes("Restore")) {
      throw new Error("SettingsSidebar did not render Restore control");
    }
    if (!sidebarMarkup.includes("Saved")) {
      throw new Error("SettingsSidebar did not render saved state");
    }

    return {
      checks: ["AppRouter initial loading shell", "SettingsSidebar active navigation and restore controls"]
    };
  }
`;

fs.writeFileSync(entryPath, source, "utf8");

async function main() {
  await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node20",
    absWorkingDir: workspaceRoot,
    nodePaths: [path.join(workspaceRoot, "node_modules")],
    jsx: "automatic",
    outfile: bundlePath,
    logLevel: "silent"
  });

  const bundle = require(bundlePath);
  const result = await bundle.run();
  console.log(`Renderer smoke OK (${result.checks.join(", ")})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
