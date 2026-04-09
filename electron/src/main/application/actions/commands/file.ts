import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { dialog, shell } from "electron";
import { createDirectActionCommand } from "../action-executor";
import type { ActionCommand, ActionHandler } from "../command-types";
import {
  actionTargets,
  primaryPath,
  promptForValue
} from "../command-helpers";
import {
  ensureWritableExistingTarget,
  ensureWritableFile,
  nextDuplicatePath,
  sanitizeFileName
} from "../services/file-system-policy";

const revealInFinderHandler: ActionHandler = async (ctx) => {
  const targets = actionTargets(ctx.request.context);
  if (targets.length > 0) shell.showItemInFolder(targets[0]);
  return true;
};

const renameFileHandler: ActionHandler = async (ctx) => {
  const target = primaryPath(ctx.request.context);
  if (!target || !await ensureWritableExistingTarget(target)) return true;
  const nextName = await promptForValue(ctx.controller, {
    title: "Rename",
    message: "输入新名称",
    defaultValue: path.basename(target),
    variant: "compact"
  });
  if (!nextName) return true;
  const sanitized = sanitizeFileName(nextName);
  if (!sanitized) return true;
  fs.renameSync(target, path.join(path.dirname(target), sanitized));
  return true;
};

const trashFileHandler: ActionHandler = async (ctx) => {
  const targets = actionTargets(ctx.request.context);
  if (targets.length === 0) return true;
  const confirmed = await ctx.confirmationPolicy.confirm({
    title: "Move to Trash",
    message: `这会把 ${targets.length} 个目标移到废纸篓，是否继续？`,
    destructive: true
  });
  if (!confirmed) return true;
  for (const target of targets) await shell.trashItem(target);
  return true;
};

const duplicateFileHandler: ActionHandler = async (ctx) => {
  for (const target of actionTargets(ctx.request.context)) {
    if (!await ensureWritableExistingTarget(target)) return true;
    const copyTarget = nextDuplicatePath(target);
    const stat = fs.statSync(target);
    if (stat.isDirectory()) fs.cpSync(target, copyTarget, { recursive: true });
    else fs.copyFileSync(target, copyTarget);
  }
  return true;
};

const compressFileHandler: ActionHandler = async (ctx) => {
  const targets = actionTargets(ctx.request.context);
  if (targets.length === 0) return true;
  const first = targets[0];
  const archiveName = `${path.parse(first).name}.zip`;
  execFileSync("/usr/bin/zip", ["-r", archiveName, ...targets.map((target) => path.basename(target))], {
    cwd: path.dirname(first),
    stdio: "ignore"
  });
  shell.showItemInFolder(path.join(path.dirname(first), archiveName));
  return true;
};

const formatJsonFileHandler: ActionHandler = async (ctx) => {
  const target = primaryPath(ctx.request.context);
  if (!target || !await ensureWritableFile(target)) return true;
  const extension = path.extname(target).toLowerCase();
  if (extension !== ".json") {
    await dialog.showMessageBox({
      type: "info",
      title: "JSON Format",
      message: "仅支持 .json 文件。"
    });
    return true;
  }
  const content = fs.readFileSync(target, "utf8");
  fs.writeFileSync(target, `${JSON.stringify(JSON.parse(content), null, 2)}\n`, "utf8");
  return true;
};

const toggleExecutableHandler: ActionHandler = async (ctx) => {
  const target = primaryPath(ctx.request.context);
  if (!target || !await ensureWritableFile(target)) return true;
  const current = fs.statSync(target).mode & 0o777;
  const next = (current & 0o111) === 0 ? (current | 0o755) : (current & ~0o111);
  fs.chmodSync(target, next);
  return true;
};

export const FILE_ACTION_COMMANDS: ActionCommand[] = [
  createDirectActionCommand("finder.reveal", revealInFinderHandler),
  createDirectActionCommand("file.rename", renameFileHandler),
  createDirectActionCommand("file.trash", trashFileHandler),
  createDirectActionCommand("file.duplicate", duplicateFileHandler),
  createDirectActionCommand("file.compress", compressFileHandler),
  createDirectActionCommand("file.json-format", formatJsonFileHandler),
  createDirectActionCommand("file.toggle-executable", toggleExecutableHandler)
];

// Legacy export kept for transitional tests and modules that still bind by action id.
export const FILE_HANDLERS: Record<string, ActionHandler> = {
  "finder.reveal": revealInFinderHandler,
  "file.rename": renameFileHandler,
  "file.trash": trashFileHandler,
  "file.duplicate": duplicateFileHandler,
  "file.compress": compressFileHandler,
  "file.json-format": formatJsonFileHandler,
  "file.toggle-executable": toggleExecutableHandler
};
