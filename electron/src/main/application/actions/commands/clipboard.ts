import { clipboard } from "electron";
import path from "node:path";
import { createDirectActionCommand } from "../action-executor";
import type { ActionCommand, ActionHandler } from "../command-types";
import { actionTargets, directoryPath, relativePath, singleTargetPath } from "../services/target-path-policy";

const copyPathHandler: ActionHandler = async (ctx) => {
  clipboard.writeText(actionTargets(ctx.request.context).join("\n"));
  return true;
};

const copyRelativePathHandler: ActionHandler = async (ctx) => {
  const base = directoryPath(ctx.request.context);
  clipboard.writeText(actionTargets(ctx.request.context).map((item) => relativePath(base, item)).join("\n"));
  return true;
};

const copyFilenameHandler: ActionHandler = async (ctx) => {
  const target = singleTargetPath(ctx.request.context);
  if (!target) return true;
  clipboard.writeText(path.basename(target));
  return true;
};

const copyBasenameHandler: ActionHandler = async (ctx) => {
  const target = singleTargetPath(ctx.request.context);
  if (!target) return true;
  const parsed = path.parse(target);
  clipboard.writeText(parsed.ext ? parsed.name : parsed.base);
  return true;
};

const copyExtensionHandler: ActionHandler = async (ctx) => {
  const target = singleTargetPath(ctx.request.context);
  if (!target) return true;
  const parsed = path.parse(target);
  clipboard.writeText(parsed.ext.startsWith(".") ? parsed.ext.slice(1) : parsed.ext);
  return true;
};

export const CLIPBOARD_ACTION_COMMANDS: ActionCommand[] = [
  createDirectActionCommand("copy.path", copyPathHandler),
  createDirectActionCommand("copy.relative-path", copyRelativePathHandler),
  createDirectActionCommand("copy.filename", copyFilenameHandler),
  createDirectActionCommand("copy.basename", copyBasenameHandler),
  createDirectActionCommand("copy.extension", copyExtensionHandler)
];
