import fs from "node:fs";
import path from "node:path";
import { shell } from "electron";
import type { ActionHandler } from "../command-types";
import {
  actionTargets,
  directoryPath,
  ensureFileNameWithExtension,
  ensureWritableDirectory,
  isExecutableFile,
  primaryPath,
  resolvedSelectionDirectory,
  resolvedTargetDirectory,
  scriptPathForAction,
  templateForAction,
  streamCommandToResult
} from "../command-helpers";
import { OPEN_PREFIX_HANDLERS } from "./open";

export const PREFIX_DYNAMIC_HANDLERS: ActionHandler[] = [
  ...OPEN_PREFIX_HANDLERS,
  async (ctx) => {
    if (!ctx.request.actionID.startsWith("create.template.")) return false;
    const template = templateForAction(ctx.settings, ctx.request.actionID);
    if (!template) throw new Error(`template not found: ${ctx.request.actionID}`);
    const directory = resolvedTargetDirectory(ctx.request.context)
      ?? directoryPath(ctx.request.context)
      ?? primaryPath(ctx.request.context);
    if (!directory || !await ensureWritableDirectory(directory)) return true;
    const target = path.join(directory, ensureFileNameWithExtension(template.fileNameSuggestion, template.fileExtension));
    fs.writeFileSync(target, template.starterContent, "utf8");
    if (template.makeExecutable) fs.chmodSync(target, 0o755);
    shell.showItemInFolder(target);
    return true;
  },
  async (ctx) => {
    if (!ctx.request.actionID.startsWith("script.run.")) return false;
    const scriptPath = scriptPathForAction(ctx.request.actionID, ctx.scriptsDirectory);
    if (!scriptPath) throw new Error(`script not found: ${ctx.request.actionID}`);
    const cwd = resolvedSelectionDirectory(ctx.request.context)
      ?? directoryPath(ctx.request.context)
      ?? path.dirname(scriptPath);
    const executable = isExecutableFile(scriptPath);
    const args = executable ? actionTargets(ctx.request.context) : [scriptPath, ...actionTargets(ctx.request.context)];
    const command = executable ? scriptPath : "/bin/zsh";
    streamCommandToResult(ctx.controller, {
      title: `Script: ${path.basename(scriptPath)}`,
      command,
      args,
      cwd
    });
    return true;
  }
];
