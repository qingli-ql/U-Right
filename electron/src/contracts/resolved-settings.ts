import type {
  AIProfile,
  AISettings,
  GeneralSettings,
  IntegrationSettings,
  PromptPolicy,
  ResolvedSettings,
  TemplateSettings,
  ToolKind
} from "./contracts";

export function getGeneralSettings(settings: ResolvedSettings): GeneralSettings {
  return settings.general;
}

export function getIntegrationSettings(settings: ResolvedSettings): IntegrationSettings {
  return settings.integrations;
}

export function getTemplateSettings(settings: ResolvedSettings): TemplateSettings {
  return settings.templates;
}

export function getAISettings(settings: ResolvedSettings): AISettings {
  return settings.ai;
}

export function getActiveAIProfile(settings: ResolvedSettings): AIProfile | undefined {
  const ai = getAISettings(settings);
  return ai.profiles.find((item) => item.id === ai.defaultProfileID && item.isEnabled)
    ?? ai.profiles.find((item) => item.isEnabled)
    ?? ai.profiles[0];
}

export function getActivePromptPolicy(settings: ResolvedSettings): PromptPolicy | undefined {
  const ai = getAISettings(settings);
  return ai.promptPolicies.find((item) => item.id === ai.defaultPromptPolicyID)
    ?? ai.promptPolicies[0];
}

export function getAIActionVisibility(settings: ResolvedSettings): string[] {
  return getAISettings(settings).actionVisibility;
}

export function getCustomExecutablePath(settings: ResolvedSettings, tool: ToolKind): string | undefined {
  const integrations = getIntegrationSettings(settings);
  return integrations.customExecutablePaths[tool] || undefined;
}
