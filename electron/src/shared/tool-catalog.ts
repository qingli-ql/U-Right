import type { ToolKind } from "./contracts";

export interface ToolCatalogEntry {
  kind: ToolKind;
  label: string;
  family: "terminal" | "editor" | "assistant" | "git";
  installType: "app" | "cli" | "app-or-cli";
  appNames: string[];
  bundleIdentifiers: string[];
  binaries: string[];
}

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  {
    kind: "terminal",
    label: "Terminal",
    family: "terminal",
    installType: "app-or-cli",
    appNames: ["Terminal.app"],
    bundleIdentifiers: ["com.apple.Terminal"],
    binaries: ["open"]
  },
  {
    kind: "ghostty",
    label: "Ghostty",
    family: "terminal",
    installType: "app-or-cli",
    appNames: ["Ghostty.app"],
    bundleIdentifiers: ["com.mitchellh.ghostty"],
    binaries: ["ghostty"]
  },
  {
    kind: "iTerm",
    label: "iTerm",
    family: "terminal",
    installType: "app-or-cli",
    appNames: ["iTerm.app", "iTerm2.app"],
    bundleIdentifiers: ["com.googlecode.iterm2"],
    binaries: ["iterm2"]
  },
  {
    kind: "vscode",
    label: "VS Code",
    family: "editor",
    installType: "app-or-cli",
    appNames: ["Visual Studio Code.app", "Code.app"],
    bundleIdentifiers: ["com.microsoft.VSCode", "com.microsoft.VSCodeInsiders"],
    binaries: ["code"]
  },
  {
    kind: "cursor",
    label: "Cursor",
    family: "editor",
    installType: "app-or-cli",
    appNames: ["Cursor.app"],
    bundleIdentifiers: ["com.todesktop.230313mzl4w4u92"],
    binaries: ["cursor"]
  },
  {
    kind: "zed",
    label: "Zed",
    family: "editor",
    installType: "app-or-cli",
    appNames: ["Zed.app"],
    bundleIdentifiers: ["dev.zed.Zed"],
    binaries: ["zed"]
  },
  {
    kind: "claude",
    label: "Claude",
    family: "assistant",
    installType: "app-or-cli",
    appNames: ["Claude.app"],
    bundleIdentifiers: ["com.anthropic.claudedesktop"],
    binaries: ["claude"]
  },
  {
    kind: "codex",
    label: "Codex",
    family: "assistant",
    installType: "app-or-cli",
    appNames: ["Codex.app"],
    bundleIdentifiers: ["com.openai.codex"],
    binaries: ["codex"]
  },
  {
    kind: "gh",
    label: "GitHub CLI",
    family: "git",
    installType: "cli",
    appNames: [],
    bundleIdentifiers: [],
    binaries: ["gh"]
  },
  {
    kind: "lazygit",
    label: "LazyGit",
    family: "git",
    installType: "cli",
    appNames: [],
    bundleIdentifiers: [],
    binaries: ["lazygit"]
  },
  {
    kind: "gitup",
    label: "GitUp",
    family: "git",
    installType: "app",
    appNames: ["GitUp.app"],
    bundleIdentifiers: ["com.gitup.mac"],
    binaries: ["gitup"]
  }
];

export const TOOL_CATALOG_BY_KIND = new Map(TOOL_CATALOG.map((entry) => [entry.kind, entry]));
