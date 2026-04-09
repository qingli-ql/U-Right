import fs from "node:fs";
import path from "node:path";
import type { AppSettings, FinderActionContext } from "../../../contracts/contracts";
import type { WindowController } from "../../desktop/windows/window-controller";
import {
  BUILT_IN_EMPTY_TEMPLATE as builtInEmptyTemplatePolicy,
  ensureFileNameWithExtension as ensureFileNameWithExtensionPolicy,
  ensureWritableDirectory as ensureWritableDirectoryPolicy,
  parseNewFilePromptValue as parseNewFilePromptValuePolicy,
  templateForAction as templateForActionPolicy,
  type TemplateDefinition
} from "./services/create-template-service";
import {
  actionTargets as actionTargetsPolicy,
  directoryPath as directoryPathPolicy,
  primaryPath as primaryPathPolicy,
  relativePath as relativePathPolicy,
  resolveLocalPath as resolveLocalPathPolicy,
  resolvedSelectionDirectory as resolvedSelectionDirectoryPolicy,
  resolvedTargetDirectory as resolvedTargetDirectoryPolicy,
  selectedPaths as selectedPathsPolicy,
  singleTargetPath as singleTargetPathPolicy,
  viewDirectoryPath as viewDirectoryPathPolicy
} from "./services/target-path-policy";
import { streamCommandToResult as streamCommandToResultService } from "./services/command-output-service";

export type { TemplateDefinition };
export const BUILT_IN_EMPTY_TEMPLATE: TemplateDefinition = builtInEmptyTemplatePolicy;

export function resolveLocalPath(value?: string | null): string | null {
  return resolveLocalPathPolicy(value);
}

export function selectedPaths(context: FinderActionContext): string[] {
  return selectedPathsPolicy(context);
}

export function resolvedTargetDirectory(context: FinderActionContext): string | null {
  return resolvedTargetDirectoryPolicy(context);
}

export function resolvedSelectionDirectory(context: FinderActionContext): string | null {
  return resolvedSelectionDirectoryPolicy(context);
}

export function primaryPath(context: FinderActionContext): string | null {
  return primaryPathPolicy(context);
}

export function singleTargetPath(context: FinderActionContext): string | null {
  return singleTargetPathPolicy(context);
}

export function directoryPath(context: FinderActionContext): string | null {
  return directoryPathPolicy(context);
}

export function viewDirectoryPath(context: FinderActionContext): string | null {
  return viewDirectoryPathPolicy(context);
}

export function actionTargets(context: FinderActionContext): string[] {
  return actionTargetsPolicy(context);
}

export function ensureFileNameWithExtension(name: string, fileExtension: string): string {
  return ensureFileNameWithExtensionPolicy(name, fileExtension);
}

export function parseNewFilePromptValue(rawValue: string): { fileName: string; templateID: string; body: string } {
  return parseNewFilePromptValuePolicy(rawValue);
}

export function relativePath(base: string | null, target: string): string {
  return relativePathPolicy(base, target);
}

export function isExecutableFile(target: string): boolean {
  try {
    fs.accessSync(target, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureWritableDirectory(directory: string): Promise<boolean> {
  return ensureWritableDirectoryPolicy(directory);
}

export async function promptForValue(
  controller: WindowController,
  options: {
    title: string;
    message: string;
    defaultValue: string;
    mode?: "singleline" | "multiline";
    submitLabel?: string;
    variant?: "compact" | "full";
    placeholder?: string;
    kind?: "default" | "new-file" | "ai-request";
    selectOptions?: string[];
    defaultSelectOption?: string;
  }
): Promise<string | null> {
  return controller.openPrompt({
    title: options.title,
    message: options.message,
    defaultValue: options.defaultValue,
    mode: options.mode ?? "singleline",
    submitLabel: options.submitLabel ?? "Continue",
    variant: options.variant ?? ((options.mode ?? "singleline") === "singleline" ? "compact" : "full"),
    placeholder: options.placeholder,
    kind: options.kind,
    selectOptions: options.selectOptions,
    defaultSelectOption: options.defaultSelectOption
  });
}

export function templateForAction(settings: AppSettings, actionID: string): TemplateDefinition | undefined {
  return templateForActionPolicy(settings, actionID);
}

export function scriptPathForAction(actionID: string, scriptsDirectory: string): string | null {
  const scriptName = actionID.replace(/^script\.run\./, "");
  const scriptPath = path.join(scriptsDirectory, scriptName);
  return fs.existsSync(scriptPath) ? scriptPath : null;
}

export function streamCommandToResult(
  controller: WindowController,
  options: {
    title: string;
    command: string;
    args: string[];
    cwd?: string | null;
    suggestedFilePath?: string | null;
  }
) {
  streamCommandToResultService(controller, options);
}

export function summarizeContext(context: FinderActionContext): string {
  if (context.selectionKind === "file" && context.primaryURL) return `File: ${context.primaryURL}`;
  if ((context.selectionKind === "folder" || context.selectionKind === "empty") && (context.primaryURL || context.currentDirectoryURL)) {
    return `Directory: ${context.primaryURL ?? context.currentDirectoryURL}`;
  }
  return context.selectedURLs.join("\n");
}
