import { createDirectActionCommand } from "../action-executor";
import type { ActionCommand, ActionHandler } from "../command-types";
import {
  actionTargets,
  directoryPath,
  primaryPath,
  resolvedSelectionDirectory
} from "../services/target-path-policy";
import { openEditor, openInGhostty, openInTerminal, openWithCustomApp } from "../services/open-launch-service";

const openTerminalHandler: ActionHandler = async (ctx) => {
  const directory = resolvedSelectionDirectory(ctx.request.context)
    ?? directoryPath(ctx.request.context)
    ?? primaryPath(ctx.request.context);
  if (directory) openInTerminal(directory, ctx.settings);
  return true;
};

const openVSCodeHandler: ActionHandler = async (ctx) => {
  const target = primaryPath(ctx.request.context) ?? directoryPath(ctx.request.context);
  if (target) openEditor(target, "vscode");
  return true;
};

const openCursorHandler: ActionHandler = async (ctx) => {
  const target = primaryPath(ctx.request.context) ?? directoryPath(ctx.request.context);
  if (target) openEditor(target, "cursor");
  return true;
};

const openZedHandler: ActionHandler = async (ctx) => {
  const target = primaryPath(ctx.request.context) ?? directoryPath(ctx.request.context);
  if (target) openEditor(target, "zed");
  return true;
};

const openGhosttyHandler: ActionHandler = async (ctx) => {
  const directory = resolvedSelectionDirectory(ctx.request.context)
    ?? directoryPath(ctx.request.context)
    ?? primaryPath(ctx.request.context);
  if (!directory) return true;
  openInGhostty(directory);
  return true;
};

export const OPEN_ACTION_COMMANDS: ActionCommand[] = [
  createDirectActionCommand("open.terminal", openTerminalHandler),
  createDirectActionCommand("open.vscode", openVSCodeHandler),
  createDirectActionCommand("open.cursor", openCursorHandler),
  createDirectActionCommand("open.zed", openZedHandler),
  createDirectActionCommand("open.ghostty", openGhosttyHandler)
];

export const OPEN_HANDLERS: Record<string, ActionHandler> = {
  "open.terminal": openTerminalHandler,
  "open.vscode": openVSCodeHandler,
  "open.cursor": openCursorHandler,
  "open.zed": openZedHandler,
  "open.ghostty": openGhosttyHandler
};

export const OPEN_PREFIX_HANDLERS: ActionHandler[] = [
  async (ctx) => {
    if (!ctx.request.actionID.startsWith("open.custom.")) return false;
    const customID = ctx.request.actionID.replace(/^open\.custom\./, "");
    const customAction = ctx.settings.customActions.openActions.find((item) => item.id === customID && item.isEnabled);
    if (!customAction?.appPath) throw new Error(`custom app not found: ${ctx.request.actionID}`);
    openWithCustomApp(actionTargets(ctx.request.context), customAction.appPath);
    return true;
  }
];
