import type {
  AIProfile,
  AISettings,
  AppSettings,
  GeneralSettings,
  IntegrationSettings,
  PromptPolicy,
  TemplateSettings,
  ToolKind
} from "./contracts";

export function getGeneralSettings(settings: AppSettings): GeneralSettings {
  return settings.general;
}

export function getIntegrationSettings(settings: AppSettings): IntegrationSettings {
  return settings.integrations;
}

export function getTemplateSettings(settings: AppSettings): TemplateSettings {
  return settings.templates;
}

export function getAISettings(settings: AppSettings): AISettings {
  return settings.ai;
}

export function getActiveAIProfile(settings: AppSettings): AIProfile | undefined {
  const ai = getAISettings(settings);
  return ai.profiles.find((item) => item.id === ai.defaultProfileID && item.isEnabled)
    ?? ai.profiles.find((item) => item.isEnabled)
    ?? ai.profiles[0];
}

export function getActivePromptPolicy(settings: AppSettings): PromptPolicy | undefined {
  const ai = getAISettings(settings);
  return ai.promptPolicies.find((item) => item.id === ai.defaultPromptPolicyID)
    ?? ai.promptPolicies[0];
}

export function getAIActionVisibility(settings: AppSettings): string[] {
  return getAISettings(settings).actionVisibility;
}

export function getCustomExecutablePath(settings: AppSettings, tool: ToolKind): string | undefined {
  const integrations = getIntegrationSettings(settings);
  return integrations.customExecutablePaths[tool] || undefined;
}
