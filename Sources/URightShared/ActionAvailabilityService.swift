import Foundation

public enum ActionAvailabilityService {
    public static func evaluate(definition: ActionDefinition, context: FinderActionContext, settings: AppSettings) -> ActionAvailability {
        guard definition.implementationStatus == .implemented || definition.implementationStatus == .beta else {
            return .init(isVisible: false, isEnabled: false, disabledReason: "未实现")
        }
        guard definition.supportedContexts.contains(context.selectionKind) else {
            return .init(isVisible: false, isEnabled: false, disabledReason: "当前上下文不支持")
        }
        guard actionSetting(for: definition.id, settings: settings)?.isEnabled ?? definition.defaultVisible else {
            return .init(isVisible: false, isEnabled: false, disabledReason: "已在设置中隐藏")
        }
        let category = resolvedCategory(for: definition, settings: settings)
        guard categorySetting(for: category, settings: settings)?.isEnabled ?? true else {
            return .init(isVisible: false, isEnabled: false, disabledReason: "分类已隐藏")
        }
        if definition.requirements.requiresSingleSelection, context.selectedURLs.count > 1 {
            return .init(isVisible: false, isEnabled: false, disabledReason: "仅支持单个目标")
        }
        if definition.requirements.requiresDirectoryContext, !hasWorkingDirectory(context: context) {
            return .init(isVisible: false, isEnabled: false, disabledReason: "缺少目录上下文")
        }
        if definition.requirements.requiresWritableTarget, !hasWritableTarget(context: context) {
            return .init(isVisible: false, isEnabled: false, disabledReason: "目标不可写")
        }
        if definition.requirements.requiresAI {
            if !settings.ai.enabled {
                return .init(isVisible: false, isEnabled: false, disabledReason: "AI 已禁用")
            }
            if !settings.ai.actionVisibility.contains(definition.id) {
                return .init(isVisible: false, isEnabled: false, disabledReason: "AI 动作未启用")
            }
            if !hasAvailableAIBackend(context: context, definition: definition) {
                return .init(
                    isVisible: settings.contextMenu.showUnavailableInPreview,
                    isEnabled: false,
                    disabledReason: missingAIBackendReason(for: definition)
                )
            }
        }
        if let requiredTool = definition.requirements.requiredTool {
            let toolPreference = settings.integrations.toolPreferences.first { $0.kind == requiredTool }
            guard toolPreference?.allowMenuActions ?? true else {
                return .init(isVisible: false, isEnabled: false, disabledReason: "工具动作已禁用")
            }
            guard context.detectedTools[requiredTool]?.isInstalled == true else {
                return .init(
                    isVisible: settings.contextMenu.showUnavailableInPreview,
                    isEnabled: false,
                    disabledReason: "未检测到 \(requiredTool.rawValue)"
                )
            }
        }
        return .init(isVisible: true, isEnabled: true, disabledReason: nil)
    }

    public static func resolvedCategory(for definition: ActionDefinition, settings: AppSettings) -> ActionCategory {
        actionSetting(for: definition.id, settings: settings)?.categoryOverride ?? definition.defaultCategory
    }

    public static func resolvedOrder(for definition: ActionDefinition, settings: AppSettings) -> Int {
        actionSetting(for: definition.id, settings: settings)?.orderOverride ?? definition.defaultOrder
    }

    public static func categorySetting(for category: ActionCategory, settings: AppSettings) -> MenuCategorySettings? {
        settings.contextMenu.categorySettings.first { $0.category == category }
    }

    public static func actionSetting(for actionID: String, settings: AppSettings) -> MenuActionSettings? {
        settings.contextMenu.actionSettings.first { $0.actionID == actionID }
    }

    private static func hasWorkingDirectory(context: FinderActionContext) -> Bool {
        if context.resolvedTargetDirectory != nil || context.resolvedSelectionDirectory != nil {
            return true
        }
        if let capabilities = context.capabilities {
            return capabilities.hasWorkingDirectory
        }
        return context.workingDirectoryURL != nil
    }

    private static func hasWritableTarget(context: FinderActionContext) -> Bool {
        if let capabilities = context.capabilities {
            return capabilities.hasWritableTarget
        }
        let target = context.selectedURLs.first ?? context.workingDirectoryURL
        guard let target else { return false }
        if !FileManager.default.fileExists(atPath: target.path) {
            return FileManager.default.isWritableFile(atPath: target.deletingLastPathComponent().path)
        }
        return FileManager.default.isWritableFile(atPath: target.path)
    }

    private static func hasAvailableAIBackend(context: FinderActionContext, definition: ActionDefinition) -> Bool {
        if definition.id == ActionIDs.aiAskClaude {
            return context.detectedTools[.claude]?.isInstalled == true
        }
        if definition.id == ActionIDs.aiAskCodex {
            return context.detectedTools[.codex]?.isInstalled == true
        }
        return context.detectedTools[.claude]?.isInstalled == true
            || context.detectedTools[.codex]?.isInstalled == true
    }

    private static func missingAIBackendReason(for definition: ActionDefinition) -> String {
        if definition.id == ActionIDs.aiAskClaude {
            return "未检测到 Claude CLI"
        }
        if definition.id == ActionIDs.aiAskCodex {
            return "未检测到 Codex CLI"
        }
        return "未检测到可用 AI CLI"
    }
}

@available(*, deprecated, renamed: "ActionAvailabilityService")
public typealias ActionAvailabilityEvaluator = ActionAvailabilityService
