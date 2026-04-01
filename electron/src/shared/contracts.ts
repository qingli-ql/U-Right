export type SelectionKind = "file" | "folder" | "mixed" | "empty" | "multi";
export type ActionCategory =
  | "create"
  | "open"
  | "clipboard"
  | "fileOps"
  | "view"
  | "ai"
  | "scripts"
  | "templates"
  | "git"
  | "advanced";
export type MenuCategoryDisplayStyle = "inline" | "submenu";
export type ToolKind =
  | "terminal"
  | "ghostty"
  | "iTerm"
  | "vscode"
  | "cursor"
  | "zed"
  | "claude"
  | "codex"
  | "gh"
  | "lazygit"
  | "gitup";
export type AIProvider = "auto" | "claudeCLI" | "codexCLI" | "openAICompatible";

export interface MenuCategorySettings {
  category: ActionCategory;
  isEnabled: boolean;
  order: number;
  displayStyle: MenuCategoryDisplayStyle;
}

export interface MenuActionSettings {
  actionID: string;
  isEnabled: boolean;
  categoryOverride?: ActionCategory | null;
  orderOverride?: number | null;
}

export interface ContextMenuSettings {
  categorySettings: MenuCategorySettings[];
  actionSettings: MenuActionSettings[];
  collapseSingleActionGroups: boolean;
  showUnavailableInPreview: boolean;
}

export interface ToolPreference {
  kind: ToolKind;
  customPath: string;
  allowMenuActions: boolean;
}

export interface AppSettings {
  launchAtLogin: boolean;
  showMenuBarIcon: boolean;
  showExtensionStatus: boolean;
  defaultTerminal: ToolKind;
  defaultEditor: ToolKind;
  aiEnabled: boolean;
  preferredAIProvider: AIProvider;
  apiBaseURL: string;
  apiKey: string;
  apiModel: string;
  systemPromptTemplate: string;
  maxContextFileSize: number;
  maxFolderScanDepth: number;
  includeHiddenFiles: boolean;
  customTemplateFolder: string;
  debugLogging: boolean;
  customExecutablePaths: Record<string, string>;
  pinnedActionIDs: string[];
  recentActionIDs: string[];
  lastAIActionID?: string | null;
  contextMenu: ContextMenuSettings;
  toolPreferences: ToolPreference[];
  aiActionVisibility: string[];
}

export interface ToolAvailability {
  kind: ToolKind;
  isInstalled: boolean;
  executablePath?: string;
  appPath?: string;
}

export interface FileMetadata {
  url: string;
  isDirectory: boolean;
  fileSize?: number | null;
  uti?: string | null;
  fileExtension: string;
  isScriptLike: boolean;
}

export interface FinderActionContext {
  selectedURLs: string[];
  primaryURL?: string | null;
  currentDirectoryURL?: string | null;
  selectionKind: SelectionKind;
  detectedTools: Partial<Record<ToolKind, ToolAvailability>>;
  fileMetadata: FileMetadata[];
  extensionWindowTitle?: string | null;
}

export interface ActionRequest {
  id: string;
  actionID: string;
  context: FinderActionContext;
  createdAt: string;
}

export interface StoredSettingsDocument {
  version: number;
  updatedAt: string;
  settings: AppSettings;
}

export type WindowKind = "settings" | "result" | "prompt" | "logs" | "onboarding";

export interface PromptWindowPayload {
  title: string;
  message: string;
  defaultValue: string;
  mode: "singleline" | "multiline";
  submitLabel: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export interface ResultWindowPayload {
  title: string;
  markdown: string;
  canApplyToFile: boolean;
  suggestedFilePath?: string | null;
  workingDirectory?: string | null;
}

export interface WindowContextPayload {
  kind: WindowKind;
  prompt?: PromptWindowPayload;
  result?: ResultWindowPayload;
}
