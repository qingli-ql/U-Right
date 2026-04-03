import type { AIProfile, AppSettings, PromptPolicy } from "./contracts";
import {
  ACTION_CATEGORY_META,
  DEFAULT_VISIBLE_AI_ACTION_IDS,
  TOOL_ORDER,
  createDefaultActionSettings,
  createDefaultCategorySettings
} from "./action-registry";

export { ACTION_CATEGORY_META, TOOL_ORDER } from "./action-registry";
export { actionTitleFor } from "./action-registry";

const DEFAULT_AI_PROFILES: AIProfile[] = [
  {
    id: "default-openai-compatible",
    name: "Default OpenAI-Compatible",
    provider: "openAICompatible",
    apiBaseURL: "https://api.openai.com/v1",
    apiKey: "",
    apiModel: "gpt-4.1-mini",
    isEnabled: true
  }
];

const DEFAULT_PROMPT_POLICIES: PromptPolicy[] = [
  {
    id: "project-explain",
    name: "Project Explain",
    systemPromptTemplate:
      "You are a technical product-minded engineer helping a teammate quickly understand a project.\n\nGoals:\n- Explain what the selected project/file likely does.\n- Infer the architecture, key modules, data flow, and likely workflow.\n- Highlight missing pieces, risks, and next steps.\n\nOutput:\n1. What this is\n2. How it is structured\n3. What is already implemented\n4. What looks missing or incomplete\n5. Recommended next steps\n\nRules:\n- Prefer clear structure over exhaustive detail.\n- Distinguish observed facts from reasonable inference.",
    maxContextFileSize: 64000,
    maxFolderScanDepth: 3,
    includeHiddenFiles: false
  },
  {
    id: "code-review",
    name: "Code Review",
    systemPromptTemplate:
      "You are a precise senior code reviewer.\n\nGoals:\n- Identify correctness issues, regressions, risky assumptions, and maintainability problems.\n- Prioritize concrete findings over broad praise.\n- When evidence is insufficient, say what is uncertain.\n\nOutput:\n1. Summary\n2. Findings (severity + explanation + suggested fix)\n3. Optional refactor suggestions\n\nRules:\n- Be specific and reference the provided files/context only.\n- Do not invent project facts that are not supported by the context.",
    maxContextFileSize: 64000,
    maxFolderScanDepth: 3,
    includeHiddenFiles: false
  },
  {
    id: "draft-content",
    name: "Draft Content",
    systemPromptTemplate:
      "You are a pragmatic engineering assistant generating first-draft project content.\n\nGoals:\n- Produce usable output such as README, .gitignore, commit message, PR summary, or documentation.\n- Optimize for practical completeness, not generic filler.\n\nOutput:\n- Return the final draft first.\n- Then provide short notes about assumptions and what may need manual adjustment.\n\nRules:\n- Match the project context and tech stack.\n- Avoid boilerplate that is not grounded in the provided context.",
    maxContextFileSize: 64000,
    maxFolderScanDepth: 3,
    includeHiddenFiles: false
  }
];

export function createDefaultSettings(): AppSettings {
  return {
    pinnedActionIDs: [],
    recentActionIDs: [],
    lastAIActionID: null,
    contextMenu: {
      categorySettings: createDefaultCategorySettings(),
      actionSettings: createDefaultActionSettings(),
      collapseSingleActionGroups: true,
      showUnavailableInPreview: false
    },
    general: {
      launchAtLogin: false,
      showMenuBarIcon: true,
      showExtensionStatus: true
    },
    integrations: {
      defaultTerminal: "terminal",
      defaultEditor: "vscode",
      toolPreferences: TOOL_ORDER.map((kind) => ({
        kind,
        customPath: "",
        allowMenuActions: true
      })),
      customExecutablePaths: {}
    },
    templates: {
      customTemplateFolder: "",
      userTemplates: [],
      extensionDefaults: []
    },
    ai: {
      enabled: true,
      preferredProvider: "auto",
      profiles: DEFAULT_AI_PROFILES,
      defaultProfileID: DEFAULT_AI_PROFILES[0].id,
      promptPolicies: DEFAULT_PROMPT_POLICIES,
      defaultPromptPolicyID: DEFAULT_PROMPT_POLICIES[0].id,
      actionVisibility: DEFAULT_VISIBLE_AI_ACTION_IDS
    },
    customActions: {
      openActions: []
    },
    advanced: {
      debugLogging: false
    }
  };
}
