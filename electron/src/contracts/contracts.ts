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

export interface GeneralSettings {
  launchAtLogin: boolean;
  showMenuBarIcon: boolean;
  showExtensionStatus: boolean;
}

export interface IntegrationSettings {
  defaultTerminal: ToolKind;
  defaultEditor: ToolKind;
  toolPreferences: ToolPreference[];
  customExecutablePaths: Record<string, string>;
}

export interface UserTemplateItem {
  id: string;
  name: string;
  fileExtension: string;
  defaultFileName: string;
  starterContent: string;
  makeExecutable: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

export interface ExtensionTemplateDefault {
  fileExtension: string;
  templateID: string;
}

export interface TemplateSettings {
  customTemplateFolder: string;
  userTemplates: UserTemplateItem[];
  extensionDefaults: ExtensionTemplateDefault[];
  hiddenBuiltInTemplateIDs: string[];
}

export interface AIProfile {
  id: string;
  name: string;
  provider: AIProvider;
  apiBaseURL: string;
  apiKey: string;
  apiModel: string;
  isEnabled: boolean;
}

export interface PromptPolicy {
  id: string;
  name: string;
  systemPromptTemplate: string;
  maxContextFileSize: number;
  maxFolderScanDepth: number;
  includeHiddenFiles: boolean;
}

export interface AISettings {
  enabled: boolean;
  preferredProvider: AIProvider;
  profiles: AIProfile[];
  defaultProfileID?: string | null;
  promptPolicies: PromptPolicy[];
  defaultPromptPolicyID?: string | null;
  actionVisibility: string[];
}

export interface CustomOpenAction {
  id: string;
  name: string;
  appPath: string;
  bundleIdentifier?: string | null;
  targetKind: "file" | "folder" | "any";
  isEnabled: boolean;
  sortOrder: number;
  category: ActionCategory;
}

export interface CustomActionSettings {
  openActions: CustomOpenAction[];
}

export interface AdvancedSettings {
  debugLogging: boolean;
}

export interface AppSettings {
  pinnedActionIDs: string[];
  recentActionIDs: string[];
  lastAIActionID?: string | null;
  contextMenu: ContextMenuSettings;
  general: GeneralSettings;
  integrations: IntegrationSettings;
  templates: TemplateSettings;
  ai: AISettings;
  customActions: CustomActionSettings;
  advanced: AdvancedSettings;
}

export interface StoredSettingsV3 extends AppSettings {}

export type ResolvedSettings = AppSettings;

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

export interface FinderContextCapabilities {
  hasWorkingDirectory: boolean;
  hasWritableTarget: boolean;
  scriptNames?: string[];
}

export interface FinderActionContext {
  selectedURLs: string[];
  primaryURL?: string | null;
  currentDirectoryURL?: string | null;
  resolvedTargetDirectory?: string | null;
  resolvedPrimaryTarget?: string | null;
  resolvedSelectionDirectory?: string | null;
  selectionKind: SelectionKind;
  detectedTools: Partial<Record<ToolKind, ToolAvailability>>;
  fileMetadata: FileMetadata[];
  extensionWindowTitle?: string | null;
  capabilities?: FinderContextCapabilities;
}

export interface ActionRequest {
  id: string;
  actionID: string;
  context: FinderActionContext;
  createdAt: string;
}

export type RequestQueueState = "done" | "failed";

export interface RequestQueueEntrySummary {
  requestID: string;
  actionID?: string | null;
  actionTitle?: string | null;
  state: RequestQueueState;
  sourceFileName: string;
  selectionKind?: SelectionKind | null;
  selectedCount?: number | null;
  processedAt: string;
  error?: string | null;
}

export interface StoredSettingsDocument {
  version: number;
  updatedAt: string;
  settings: StoredSettingsV3;
}

export interface SettingsHistorySnapshot {
  updatedAt: string;
  settings: AppSettings;
}

export interface AppDiagnostics {
  appGroupIdentifier: string;
  sharedRoot: string;
  settingsFile: string;
  settingsVersion: number;
  settingsUpdatedAt?: string | null;
  candidateGroupContainers: string[];
  warning?: string | null;
  errors?: string[];
  availableScriptNames?: string[];
  finderMenuSnapshot?: FinderMenuSnapshot | null;
}

export interface FinderMenuSnapshotAction {
  id: string;
  title: string;
  isEnabled: boolean;
  statusBadge?: string | null;
  children: FinderMenuSnapshotAction[];
}

export interface FinderMenuSnapshotAvailability {
  actionID: string;
  title: string;
  isVisible: boolean;
  isEnabled: boolean;
  reason?: string | null;
}

export interface FinderMenuSnapshot {
  updatedAt: string;
  appGroupIdentifier: string;
  settingsVersion?: number | null;
  context: FinderActionContext;
  menu: FinderMenuSnapshotAction[];
  availability?: FinderMenuSnapshotAvailability[];
}

export type WindowKind = "settings" | "result" | "prompt" | "logs" | "onboarding";

export interface PromptWindowPayload {
  title: string;
  message: string;
  defaultValue: string;
  mode: "singleline" | "multiline";
  submitLabel: string;
  variant?: "compact" | "full";
  placeholder?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  kind?: "default" | "new-file" | "ai-request";
  selectOptions?: string[];
  defaultSelectOption?: string;
}

export type ResultWindowKind = "default" | "ai";
export type ResultWindowStatus = "running" | "completed" | "failed";

export interface ResultWindowPayload {
  title: string;
  markdown: string;
  canApplyToFile: boolean;
  suggestedFilePath?: string | null;
  workingDirectory?: string | null;
  kind?: ResultWindowKind;
  status?: ResultWindowStatus;
  providerLabel?: string | null;
  externalTool?: "claude" | "codex" | null;
  externalPrompt?: string | null;
  contextLabel?: string | null;
}

export interface WindowContextPayload {
  kind: WindowKind;
  prompt?: PromptWindowPayload;
  result?: ResultWindowPayload;
}
