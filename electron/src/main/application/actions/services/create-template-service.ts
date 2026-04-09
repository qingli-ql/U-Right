import fs from "node:fs";
import { getRuntimeTemplateDefinitions } from "../../../../contracts/action-registry";
import type { AppSettings } from "../../../../contracts/contracts";

export interface TemplateDefinition {
  id: string;
  title: string;
  fileNameSuggestion: string;
  fileExtension: string;
  starterContent: string;
  makeExecutable?: boolean;
}

export const BUILT_IN_EMPTY_TEMPLATE: TemplateDefinition = {
  id: "empty",
  title: "Empty File...",
  fileNameSuggestion: "untitled",
  fileExtension: "",
  starterContent: ""
};

export function ensureFileNameWithExtension(name: string, fileExtension: string): string {
  if (!fileExtension) return name;
  return name.toLowerCase().endsWith(`.${fileExtension.toLowerCase()}`)
    ? name
    : `${name}.${fileExtension}`;
}

export function parseNewFilePromptValue(rawValue: string): { fileName: string; templateID: string; body: string } {
  const fallback = { fileName: "untitled", templateID: "empty", body: "" };
  if (!rawValue) return fallback;
  try {
    const parsed = JSON.parse(rawValue) as Partial<{ fileName: string; templateID: string; body: string }>;
    return {
      fileName: parsed.fileName?.trim() || fallback.fileName,
      templateID: parsed.templateID?.trim() || fallback.templateID,
      body: parsed.body ?? ""
    };
  } catch {
    return {
      fileName: rawValue.trim() || fallback.fileName,
      templateID: fallback.templateID,
      body: ""
    };
  }
}

export async function ensureWritableDirectory(directory: string): Promise<boolean> {
  try {
    fs.accessSync(directory, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function templateForAction(settings: AppSettings, actionID: string): TemplateDefinition | undefined {
  const templateID = actionID.replace(/^create\.template\./, "");
  const runtime = getRuntimeTemplateDefinitions(settings).find((template) => template.id === templateID);
  if (!runtime) return undefined;
  return {
    id: runtime.id,
    title: runtime.title,
    fileNameSuggestion: runtime.fileNameSuggestion,
    fileExtension: runtime.fileExtension,
    starterContent: runtime.starterContent,
    makeExecutable: runtime.makeExecutable
  };
}
