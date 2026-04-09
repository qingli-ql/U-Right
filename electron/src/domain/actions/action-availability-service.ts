import type { AppSettings, FinderActionContext, SelectionKind, ToolKind } from "../../contracts/contracts";
import { getAIActionVisibility, getIntegrationSettings } from "../../contracts/resolved-settings";

export type ActionImplementationStatus = "implemented" | "beta" | "planned";

export interface ActionAvailabilityDefinition {
  id: string;
  supportedContexts: SelectionKind[];
  implementationStatus?: ActionImplementationStatus;
  requiredTool?: ToolKind;
  requiresAI?: boolean;
  requiresWritableTarget?: boolean;
  requiresSingleSelection?: boolean;
  requiresDirectoryContext?: boolean;
}

export interface ActionAvailability {
  isVisible: boolean;
  isEnabled: boolean;
  disabledReason?: string;
}

export interface EvaluateActionAvailabilityInput {
  definition: ActionAvailabilityDefinition;
  context: FinderActionContext;
  settings: AppSettings;
  isActionEnabled: boolean;
  isCategoryEnabled: boolean;
  formatDisabledReason?: (reason: string | undefined) => string | undefined;
}

function applyDisabledReason(
  formatter: ((reason: string | undefined) => string | undefined) | undefined,
  reason: string | undefined
) {
  return formatter ? formatter(reason) : reason;
}

function hasWorkingDirectory(context: FinderActionContext) {
  if (context.resolvedTargetDirectory || context.resolvedSelectionDirectory) {
    return true;
  }
  if (typeof context.capabilities?.hasWorkingDirectory === "boolean") {
    return context.capabilities.hasWorkingDirectory;
  }
  if (context.currentDirectoryURL) {
    return true;
  }
  return context.selectionKind === "folder" || context.selectionKind === "file";
}

function hasWritableTarget(context: FinderActionContext) {
  if (typeof context.capabilities?.hasWritableTarget === "boolean") {
    return context.capabilities.hasWritableTarget;
  }
  return context.selectionKind === "file" || context.selectionKind === "folder" || context.selectionKind === "empty" || context.selectionKind === "multi";
}

function hasAvailableAIBackend(context: FinderActionContext, definitionID: string) {
  if (definitionID === "ai.ask-claude") {
    return context.detectedTools.claude?.isInstalled === true;
  }
  if (definitionID === "ai.ask-codex") {
    return context.detectedTools.codex?.isInstalled === true;
  }
  return context.detectedTools.claude?.isInstalled === true || context.detectedTools.codex?.isInstalled === true;
}

function missingAIBackendReason(definitionID: string) {
  if (definitionID === "ai.ask-claude") {
    return "未检测到 Claude CLI";
  }
  if (definitionID === "ai.ask-codex") {
    return "未检测到 Codex CLI";
  }
  return "未检测到可用 AI CLI";
}

export function evaluateActionAvailabilityWithPolicies({
  definition,
  context,
  settings,
  isActionEnabled,
  isCategoryEnabled,
  formatDisabledReason
}: EvaluateActionAvailabilityInput): ActionAvailability {
  if ((definition.implementationStatus ?? "implemented") === "planned") {
    return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "未实现") };
  }
  if (!definition.supportedContexts.includes(context.selectionKind)) {
    return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "当前上下文不支持") };
  }
  if (!isActionEnabled) {
    return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "已在设置中隐藏") };
  }
  if (!isCategoryEnabled) {
    return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "分类已隐藏") };
  }
  if (definition.requiresSingleSelection && context.selectedURLs.length > 1) {
    return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "仅支持单个目标") };
  }
  if (definition.requiresDirectoryContext && !hasWorkingDirectory(context)) {
    return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "缺少目录上下文") };
  }
  if (definition.requiresWritableTarget && !hasWritableTarget(context)) {
    return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "目标不可写") };
  }
  if (definition.requiresAI) {
    if (!settings.ai.enabled) {
      return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "AI 已禁用") };
    }
    if (!getAIActionVisibility(settings).includes(definition.id)) {
      return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "AI 动作未启用") };
    }
    if (!hasAvailableAIBackend(context, definition.id)) {
      return {
        isVisible: settings.contextMenu.showUnavailableInPreview,
        isEnabled: false,
        disabledReason: applyDisabledReason(formatDisabledReason, missingAIBackendReason(definition.id))
      };
    }
  }
  if (definition.requiredTool) {
    const preference = getIntegrationSettings(settings).toolPreferences.find((item) => item.kind === definition.requiredTool);
    if (!(preference?.allowMenuActions ?? true)) {
      return { isVisible: false, isEnabled: false, disabledReason: applyDisabledReason(formatDisabledReason, "工具动作已禁用") };
    }
    if (!(context.detectedTools[definition.requiredTool]?.isInstalled === true)) {
      return {
        isVisible: settings.contextMenu.showUnavailableInPreview,
        isEnabled: false,
        disabledReason: applyDisabledReason(formatDisabledReason, `未检测到 ${definition.requiredTool}`)
      };
    }
  }
  return { isVisible: true, isEnabled: true };
}
