import { refreshFinderWindows, toggleFinderHiddenFiles } from "../../finder/view-actions";
import { createDirectActionCommand } from "../action-executor";
import type { ActionCommand, ActionHandler } from "../command-types";
import { directoryPath, primaryPath, resolvedTargetDirectory, viewDirectoryPath } from "../command-helpers";
import { streamCommandToResult } from "../services/command-output-service";

const gitStatusHandler: ActionHandler = async (ctx) => {
  const cwd = resolvedTargetDirectory(ctx.request.context)
    ?? directoryPath(ctx.request.context)
    ?? primaryPath(ctx.request.context);
  if (!cwd) return true;
  streamCommandToResult(ctx.controller, {
    title: "Git Status",
    command: "/usr/bin/env",
    args: ["git", "status", "--short", "--branch"],
    cwd
  });
  return true;
};

const refreshViewHandler: ActionHandler = async (ctx) => {
  const result = await refreshFinderWindows({ directoryPath: viewDirectoryPath(ctx.request.context), activateFinder: true });
  if (!result.ok) throw new Error(result.errorMessage ?? result.message);
  return true;
};

const toggleHiddenViewHandler: ActionHandler = async (ctx) => {
  const directory = viewDirectoryPath(ctx.request.context);
  if (!directory) throw new Error("missing directory context");
  const result = await toggleFinderHiddenFiles({ directoryPath: directory, activateFinder: true });
  if (!result.ok) throw new Error(result.errorMessage ?? result.message);
  return true;
};

export const VIEW_GIT_ACTION_COMMANDS: ActionCommand[] = [
  createDirectActionCommand("git.status", gitStatusHandler),
  createDirectActionCommand("view.refresh", refreshViewHandler),
  createDirectActionCommand("view.toggle-hidden", toggleHiddenViewHandler)
];

export const VIEW_GIT_HANDLERS: Record<string, ActionHandler> = {
  "git.status": gitStatusHandler,
  "view.refresh": refreshViewHandler,
  "view.toggle-hidden": toggleHiddenViewHandler
};
