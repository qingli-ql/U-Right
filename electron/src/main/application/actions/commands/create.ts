import fs from "node:fs";
import path from "node:path";
import { shell } from "electron";
import { getRuntimeTemplateDefinitions } from "../../../../contracts/action-registry";
import { createDirectActionCommand } from "../action-executor";
import type { ActionCommand, ActionHandler } from "../command-types";
import {
  BUILT_IN_EMPTY_TEMPLATE,
  ensureFileNameWithExtension,
  ensureWritableDirectory,
  parseNewFilePromptValue
} from "../services/create-template-service";
import { directoryPath, primaryPath, resolvedTargetDirectory } from "../services/target-path-policy";
import { promptForValue } from "../command-helpers";
import { sanitizeFileName } from "../services/file-system-policy";

const createNewFileHandler: ActionHandler = async (ctx) => {
  const directory = resolvedTargetDirectory(ctx.request.context)
    ?? directoryPath(ctx.request.context)
    ?? primaryPath(ctx.request.context);
  if (!directory || !await ensureWritableDirectory(directory)) return true;

  const templateDefinitions = [BUILT_IN_EMPTY_TEMPLATE, ...getRuntimeTemplateDefinitions(ctx.settings)];
  const templateSelectOptions = templateDefinitions.map((template) => `${template.id}|${template.title}`);
  const requested = await promptForValue(ctx.controller, {
    title: "New File",
    message: "选择类型、输入文件名并可直接写入内容",
    defaultValue: JSON.stringify({
      fileName: BUILT_IN_EMPTY_TEMPLATE.fileNameSuggestion,
      templateID: BUILT_IN_EMPTY_TEMPLATE.id,
      body: ""
    }),
    mode: "multiline",
    submitLabel: "Create",
    kind: "new-file",
    selectOptions: templateSelectOptions,
    defaultSelectOption: templateSelectOptions[0]
  });
  if (!requested) return true;

  const parsed = parseNewFilePromptValue(requested);
  const template = templateDefinitions.find((item) => item.id === parsed.templateID) ?? BUILT_IN_EMPTY_TEMPLATE;
  const sanitized = sanitizeFileName(parsed.fileName || template.fileNameSuggestion || BUILT_IN_EMPTY_TEMPLATE.fileNameSuggestion);
  if (!sanitized) return true;

  const targetName = ensureFileNameWithExtension(sanitized, template.fileExtension);
  const target = path.join(directory, targetName);
  const content = parsed.body.length > 0 ? parsed.body : (template.starterContent ?? "");
  fs.writeFileSync(target, content, "utf8");
  if (template.makeExecutable) {
    fs.chmodSync(target, 0o755);
  }
  shell.showItemInFolder(target);
  return true;
};

const createNewFolderHandler: ActionHandler = async (ctx) => {
  const directory = resolvedTargetDirectory(ctx.request.context)
    ?? directoryPath(ctx.request.context)
    ?? primaryPath(ctx.request.context);
  if (!directory || !await ensureWritableDirectory(directory)) return true;
  const requested = await promptForValue(ctx.controller, {
    title: "New Folder",
    message: "输入文件夹名称",
    defaultValue: "New Folder",
    variant: "compact"
  });
  if (!requested) return true;
  const sanitized = sanitizeFileName(requested);
  if (!sanitized) return true;
  fs.mkdirSync(path.join(directory, sanitized), { recursive: false });
  return true;
};

export const CREATE_ACTION_COMMANDS: ActionCommand[] = [
  createDirectActionCommand("create.new-file", createNewFileHandler),
  createDirectActionCommand("create.new-folder", createNewFolderHandler)
];

export const CREATE_HANDLERS: Record<string, ActionHandler> = {
  "create.new-file": createNewFileHandler,
  "create.new-folder": createNewFolderHandler
};
