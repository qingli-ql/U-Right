import type { AppSettings, UserTemplateItem } from "../../contracts/contracts";
import { getTemplateSettings } from "../../contracts/resolved-settings";

export interface RuntimeTemplateDefinition {
  id: string;
  title: string;
  fileNameSuggestion: string;
  fileExtension: string;
  starterContent: string;
  makeExecutable?: boolean;
  source: "builtin" | "user";
}

export const BUILT_IN_TEMPLATE_TITLES: Readonly<Record<string, string>> = {
  empty: "Empty File...",
  text: "Text File",
  markdown: "Markdown File",
  json: "JSON File",
  python: "Python File",
  shell: "Shell Script",
  html: "HTML File",
  css: "CSS File",
  javascript: "JavaScript File",
  typescript: "TypeScript File",
  readme: "README.md",
  gitignore: ".gitignore",
  env: ".env"
};

const BUILT_IN_FILE_NAME_SUGGESTIONS: Readonly<Record<string, string>> = {
  markdown: "README",
  readme: "README",
  gitignore: ".gitignore",
  env: ".env",
  text: "notes",
  json: "data",
  python: "main",
  shell: "script",
  html: "index",
  css: "styles",
  javascript: "app",
  typescript: "app"
};

const BUILT_IN_FILE_EXTENSIONS: Readonly<Record<string, string>> = {
  markdown: "md",
  readme: "md",
  text: "txt",
  json: "json",
  python: "py",
  shell: "sh",
  html: "html",
  css: "css",
  javascript: "js",
  typescript: "ts"
};

const BUILT_IN_STARTER_CONTENT: Readonly<Record<string, string>> = {
  markdown: "# Title\n\n",
  json: "{\n  \"name\": \"value\"\n}\n",
  python:
    "#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\n\ndef main() -> None:\n    print(\"Hello from U-Right\")\n\n\nif __name__ == \"__main__\":\n    main()\n",
  shell: "#!/bin/bash\nset -euo pipefail\n\n",
  html: "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <title>U-Right</title>\n</head>\n<body>\n</body>\n</html>\n",
  css: ":root {\n  color-scheme: light dark;\n}\n",
  javascript: "console.log('Hello from U-Right');\n",
  typescript: "export function main(): void {\n  console.log('Hello from U-Right');\n}\n\nmain();\n",
  readme: "# Project\n\n## Overview\n\n",
  gitignore: ".DS_Store\nnode_modules/\n.build/\nDerivedData/\n",
  env: "# Environment variables\n"
};

export function getUserTemplates(settings: AppSettings): UserTemplateItem[] {
  return getTemplateSettings(settings).userTemplates ?? [];
}

export function getRuntimeTemplateDefinitions(settings: AppSettings): RuntimeTemplateDefinition[] {
  const hiddenBuiltInTemplateIDs = new Set(getTemplateSettings(settings).hiddenBuiltInTemplateIDs ?? []);
  const builtins: RuntimeTemplateDefinition[] = Object.entries(BUILT_IN_TEMPLATE_TITLES)
    .filter(([id]) => !hiddenBuiltInTemplateIDs.has(id))
    .map(([id, title]) => ({
      id,
      title,
      fileNameSuggestion: BUILT_IN_FILE_NAME_SUGGESTIONS[id] ?? "untitled",
      fileExtension: BUILT_IN_FILE_EXTENSIONS[id] ?? "",
      starterContent: BUILT_IN_STARTER_CONTENT[id] ?? "",
      makeExecutable: id === "python" || id === "shell",
      source: "builtin"
    }));

  const users = getUserTemplates(settings)
    .filter((item) => item.isEnabled)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map<RuntimeTemplateDefinition>((item) => ({
      id: `user.${item.id}`,
      title: item.name,
      fileNameSuggestion: item.defaultFileName,
      fileExtension: item.fileExtension,
      starterContent: item.starterContent,
      makeExecutable: item.makeExecutable,
      source: "user"
    }));

  return [...builtins, ...users];
}
