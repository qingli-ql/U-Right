import type { ActionCategory, AppSettings, FinderActionContext, SelectionKind, ToolKind } from "../../contracts/contracts";
import { evaluateActionAvailabilityWithPolicies } from "./action-availability-service";

export interface ActionAvailabilityOwnerDefinition {
  id: string;
  supportedContexts: SelectionKind[];
  implementationStatus?: "implemented" | "beta" | "planned";
  defaultCategory: ActionCategory;
  defaultOrder: number;
  defaultVisible?: boolean;
  requiredTool?: ToolKind;
  requiresAI?: boolean;
  requiresWritableTarget?: boolean;
  requiresSingleSelection?: boolean;
  requiresDirectoryContext?: boolean;
}

function actionEnabledFor(definition: ActionAvailabilityOwnerDefinition, settings: AppSettings) {
  return settings.contextMenu.actionSettings.find((item) => item.actionID === definition.id)?.isEnabled
    ?? (definition.defaultVisible ?? true);
}

function categoryEnabledFor(definition: ActionAvailabilityOwnerDefinition, settings: AppSettings) {
  const category = settings.contextMenu.actionSettings.find((item) => item.actionID === definition.id)?.categoryOverride
    ?? definition.defaultCategory;
  return settings.contextMenu.categorySettings.find((item) => item.category === category)?.isEnabled ?? true;
}

function formatDisabledReason(definition: ActionAvailabilityOwnerDefinition, reason: string | undefined) {
  if (!reason) {
    return reason;
  }
  if (reason === "当前上下文不支持") {
    if (definition.id === "create.new-file" || definition.id === "create.new-folder" || definition.id === "submenu.templates" || definition.id.startsWith("create.template.")) {
      return "仅在可解析目录目标的单选上下文中显示";
    }
  }
  if (reason === "缺少目录上下文") {
    if (definition.id === "create.new-file" || definition.id === "create.new-folder" || definition.id === "submenu.templates" || definition.id.startsWith("create.template.")) {
      return "缺少可创建内容的目标目录";
    }
    if (definition.id === "git.status") {
      return "缺少可打开 Git 状态的目标目录";
    }
    if (definition.id.startsWith("view.")) {
      return "缺少可作用的 Finder 目录";
    }
  }
  return reason;
}

export function evaluateActionAvailability(
  definition: ActionAvailabilityOwnerDefinition,
  context: FinderActionContext,
  settings: AppSettings
) {
  return evaluateActionAvailabilityWithPolicies({
    definition,
    context,
    settings,
    isActionEnabled: actionEnabledFor(definition, settings),
    isCategoryEnabled: categoryEnabledFor(definition, settings),
    formatDisabledReason: (reason) => formatDisabledReason(definition, reason)
  });
}
