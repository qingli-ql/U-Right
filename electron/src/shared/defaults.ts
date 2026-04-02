import type { AppSettings, ActionCategory, ToolKind } from "./contracts";

export const ACTION_CATEGORY_META: Array<{ category: ActionCategory; title: string }> = [
  { category: "create", title: "Create" },
  { category: "open", title: "Open" },
  { category: "clipboard", title: "Clipboard" },
  { category: "fileOps", title: "File" },
  { category: "view", title: "View" },
  { category: "ai", title: "AI" },
  { category: "git", title: "Git" },
  { category: "scripts", title: "Scripts" }
];

export const KNOWN_ACTIONS: Array<{ id: string; title: string; category: ActionCategory }> = [
  { id: "create.new-file", title: "New File", category: "create" },
  { id: "create.new-folder", title: "New Folder", category: "create" },
  { id: "submenu.templates", title: "New From Template", category: "create" },
  { id: "open.terminal", title: "Open in Terminal", category: "open" },
  { id: "open.vscode", title: "Open in VS Code", category: "open" },
  { id: "open.cursor", title: "Open in Cursor", category: "open" },
  { id: "open.zed", title: "Open in Zed", category: "open" },
  { id: "copy.path", title: "Copy Path", category: "clipboard" },
  { id: "copy.relative-path", title: "Copy Relative Path", category: "clipboard" },
  { id: "finder.reveal", title: "Reveal in Finder", category: "view" },
  { id: "file.rename", title: "Rename", category: "fileOps" },
  { id: "file.trash", title: "Move to Trash", category: "fileOps" },
  { id: "file.duplicate", title: "Duplicate", category: "fileOps" },
  { id: "file.compress", title: "Compress", category: "fileOps" },
  { id: "git.status", title: "Open Git Status Here", category: "git" },
  { id: "ai.ask-claude", title: "Ask Claude About This", category: "ai" },
  { id: "ai.ask-codex", title: "Ask Codex About This", category: "ai" },
  { id: "submenu.scripts", title: "Scripts", category: "scripts" }
];

export function actionTitleFor(actionID: string): string {
  const known = KNOWN_ACTIONS.find((item) => item.id === actionID);
  if (known) {
    return known.title;
  }
  if (actionID.startsWith("create.template.")) {
    const templateID = actionID.slice("create.template.".length);
    const template = BUILT_IN_TEMPLATE_TITLES[templateID];
    return template ?? actionID;
  }
  if (actionID.startsWith("script.run.")) {
    return actionID.slice("script.run.".length);
  }
  return actionID;
}

const BUILT_IN_TEMPLATE_TITLES: Record<string, string> = {
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

export const TOOL_ORDER: ToolKind[] = [
  "terminal",
  "ghostty",
  "iTerm",
  "vscode",
  "cursor",
  "zed",
  "claude",
  "codex",
  "gh",
  "lazygit",
  "gitup"
];

export function createDefaultSettings(): AppSettings {
  return {
    launchAtLogin: false,
    showMenuBarIcon: true,
    showExtensionStatus: true,
    defaultTerminal: "terminal",
    defaultEditor: "vscode",
    aiEnabled: true,
    preferredAIProvider: "auto",
    apiBaseURL: "https://api.openai.com/v1",
    apiKey: "",
    apiModel: "gpt-4.1-mini",
    systemPromptTemplate: "You are a precise macOS power-user assistant.",
    maxContextFileSize: 64000,
    maxFolderScanDepth: 3,
    includeHiddenFiles: false,
    customTemplateFolder: "",
    debugLogging: false,
    customExecutablePaths: {},
    pinnedActionIDs: [],
    recentActionIDs: [],
    lastAIActionID: null,
    contextMenu: {
      categorySettings: ACTION_CATEGORY_META.map((item, index) => ({
        category: item.category,
        isEnabled: true,
        order: index * 10,
        displayStyle: "submenu"
      })),
      actionSettings: KNOWN_ACTIONS.map((action, index) => ({
        actionID: action.id,
        isEnabled: index < 2 || action.category !== "ai",
        categoryOverride: null,
        orderOverride: null
      })),
      collapseSingleActionGroups: true,
      showUnavailableInPreview: false
    },
    toolPreferences: TOOL_ORDER.map((kind) => ({
      kind,
      customPath: "",
      allowMenuActions: true
    })),
    aiActionVisibility: ["ai.ask-claude", "ai.ask-codex"]
  };
}
