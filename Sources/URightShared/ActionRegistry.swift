import Foundation


public enum ActionCatalog {
    public static let categoryDefinitions: [MenuCategoryDefinition] = [
        .init(category: .create, title: "Create", systemImageName: "plus.square.on.square", defaultOrder: 0),
        .init(category: .open, title: "Open", systemImageName: "square.and.arrow.up", defaultOrder: 10),
        .init(category: .clipboard, title: "Clipboard", systemImageName: "document.on.document", defaultOrder: 20),
        .init(category: .fileOps, title: "File", systemImageName: "folder", defaultOrder: 30),
        .init(category: .view, title: "View", systemImageName: "eye", defaultOrder: 40),
        .init(category: .ai, title: "AI", systemImageName: "sparkles", defaultOrder: 50),
        .init(category: .git, title: "Git", systemImageName: "point.topleft.down.curvedto.point.bottomright.up", defaultOrder: 60),
        .init(category: .scripts, title: "Scripts", systemImageName: "terminal", defaultOrder: 70)
    ]

    public static let defaultVisibleAIActionIDs: [String] = [
        ActionIDs.aiAskClaude,
        ActionIDs.aiAskCodex
    ]

    public static let promotedVisibilityGroups: [[String]] = [
        [ActionIDs.copyFilename, ActionIDs.copyBasename, ActionIDs.copyExtension],
        [ActionIDs.showHidden, ActionIDs.refresh]
    ]

    public static let allDefinitions: [ActionDefinition] = [
        .init(id: ActionIDs.newFile, title: "New File...", systemImageName: "plus.square.on.square", defaultCategory: .create, supportedContexts: [.file, .folder, .empty], requirements: .init(requiresWritableTarget: true, requiresDirectoryContext: true), defaultOrder: 0),
        .init(id: ActionIDs.newFolder, title: "New Folder", systemImageName: "folder.badge.plus", defaultCategory: .create, supportedContexts: [.file, .folder, .empty], requirements: .init(requiresWritableTarget: true, requiresDirectoryContext: true), defaultOrder: 10),
        .init(id: "submenu.templates", title: "New From Template", systemImageName: "doc.badge.plus", defaultCategory: .create, supportedContexts: [.file, .folder, .empty], requirements: .init(requiresWritableTarget: true, requiresDirectoryContext: true), defaultOrder: 20, childrenPolicy: .builtInTemplates),
        .init(id: ActionIDs.openTerminal, title: "Open in Terminal", systemImageName: "terminal", defaultCategory: .open, supportedContexts: SelectionKind.allCases, requirements: .init(requiredTool: .terminal), defaultOrder: 0),
        .init(id: ActionIDs.openVSCode, title: "Open in VS Code", systemImageName: "chevron.left.forwardslash.chevron.right", defaultCategory: .open, supportedContexts: SelectionKind.allCases, requirements: .init(requiredTool: .vscode), defaultOrder: 10),
        .init(id: ActionIDs.openCursor, title: "Open in Cursor", systemImageName: "cursorarrow.rays", defaultCategory: .open, supportedContexts: SelectionKind.allCases, requirements: .init(requiredTool: .cursor), defaultOrder: 20),
        .init(id: ActionIDs.openZed, title: "Open in Zed", systemImageName: "bolt.badge.a", defaultCategory: .open, supportedContexts: SelectionKind.allCases, requirements: .init(requiredTool: .zed), defaultOrder: 30),
        .init(id: ActionIDs.copyPath, title: "Copy Path", systemImageName: "document.on.document", defaultCategory: .clipboard, supportedContexts: SelectionKind.allCases, defaultOrder: 0),
        .init(id: ActionIDs.copyRelativePath, title: "Copy Relative Path", systemImageName: "arrowshape.turn.up.backward.2", defaultCategory: .clipboard, supportedContexts: [.file, .folder, .multi], implementationStatus: .beta, defaultOrder: 10),
        .init(id: ActionIDs.copyFilename, title: "Copy Filename", systemImageName: "textformat.characters", defaultCategory: .clipboard, supportedContexts: [.file], implementationStatus: .implemented, defaultOrder: 20, defaultVisible: true),
        .init(id: ActionIDs.copyBasename, title: "Copy Basename", systemImageName: "character.textbox", defaultCategory: .clipboard, supportedContexts: [.file], implementationStatus: .implemented, defaultOrder: 30, defaultVisible: true),
        .init(id: ActionIDs.copyExtension, title: "Copy Extension", systemImageName: "tag", defaultCategory: .clipboard, supportedContexts: [.file], implementationStatus: .implemented, defaultOrder: 40, defaultVisible: true),
        .init(id: ActionIDs.revealInFinder, title: "Reveal in Finder", systemImageName: "finder", defaultCategory: .view, supportedContexts: [.file, .folder, .multi], defaultOrder: 0),
        .init(id: ActionIDs.rename, title: "Rename", systemImageName: "pencil", defaultCategory: .fileOps, supportedContexts: [.file, .folder], requirements: .init(requiresWritableTarget: true, requiresSingleSelection: true, needsConfirmation: true), defaultOrder: 0),
        .init(id: ActionIDs.trash, title: "Move to Trash", systemImageName: "trash", defaultCategory: .fileOps, supportedContexts: [.file, .folder, .multi], requirements: .init(requiresWritableTarget: true, isDestructive: true, needsConfirmation: true), defaultOrder: 10),
        .init(id: ActionIDs.duplicate, title: "Duplicate", systemImageName: "plus.square.on.square", defaultCategory: .fileOps, supportedContexts: [.file, .folder, .multi], implementationStatus: .beta, requirements: .init(requiresWritableTarget: true), defaultOrder: 20),
        .init(id: ActionIDs.compress, title: "Compress", systemImageName: "archivebox", defaultCategory: .fileOps, supportedContexts: [.file, .folder, .multi], implementationStatus: .beta, requirements: .init(requiresWritableTarget: true), defaultOrder: 30),
        .init(id: ActionIDs.jsonFormat, title: "JSON Format", systemImageName: "curlybraces", defaultCategory: .fileOps, supportedContexts: [.file], implementationStatus: .beta, requirements: .init(requiresWritableTarget: true, requiresSingleSelection: true, needsConfirmation: true), defaultOrder: 40),
        .init(id: ActionIDs.toggleExecutable, title: "Toggle Executable Bit", systemImageName: "switch.2", defaultCategory: .fileOps, supportedContexts: [.file], implementationStatus: .beta, requirements: .init(requiresWritableTarget: true, requiresSingleSelection: true, needsConfirmation: true), defaultOrder: 50),
        .init(id: ActionIDs.gitStatus, title: "Open Git Status Here", systemImageName: "point.topleft.down.curvedto.point.bottomright.up", defaultCategory: .git, supportedContexts: [.file, .folder, .empty], implementationStatus: .beta, requirements: .init(requiresDirectoryContext: true), defaultOrder: 0),
        .init(id: ActionIDs.aiAskClaude, title: "Ask Claude About This", systemImageName: "sparkles", defaultCategory: .ai, supportedContexts: SelectionKind.allCases, requirements: .init(requiresAI: true), defaultOrder: 0),
        .init(id: ActionIDs.aiAskCodex, title: "Ask Codex About This", systemImageName: "brain", defaultCategory: .ai, supportedContexts: SelectionKind.allCases, requirements: .init(requiresAI: true), defaultOrder: 10),
        .init(id: ActionIDs.aiExplainProject, title: "Explain This Project", systemImageName: "folder.badge.questionmark", defaultCategory: .ai, supportedContexts: [.folder, .empty, .multi], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 20, defaultVisible: false),
        .init(id: ActionIDs.aiSummarizeFiles, title: "Summarize Files", systemImageName: "doc.text.magnifyingglass", defaultCategory: .ai, supportedContexts: SelectionKind.allCases, implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 30, defaultVisible: false),
        .init(id: ActionIDs.aiGenerateReadme, title: "Generate README", systemImageName: "book.pages", defaultCategory: .ai, supportedContexts: [.folder, .empty, .multi], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 40, defaultVisible: false),
        .init(id: ActionIDs.aiGenerateGitignore, title: "Generate .gitignore", systemImageName: "nosign", defaultCategory: .ai, supportedContexts: [.folder, .empty], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 50, defaultVisible: false),
        .init(id: ActionIDs.aiReviewCode, title: "Review Code", systemImageName: "checkmark.seal.text.page", defaultCategory: .ai, supportedContexts: [.file, .folder, .multi], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 60, defaultVisible: false),
        .init(id: ActionIDs.aiRefactorFile, title: "Refactor This File", systemImageName: "wand.and.stars", defaultCategory: .ai, supportedContexts: [.file], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 70, defaultVisible: false),
        .init(id: ActionIDs.aiWriteTests, title: "Write Tests For This", systemImageName: "testtube.2", defaultCategory: .ai, supportedContexts: [.file, .folder], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 80, defaultVisible: false),
        .init(id: ActionIDs.aiExplainError, title: "Explain Error Log", systemImageName: "exclamationmark.bubble", defaultCategory: .ai, supportedContexts: [.file], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 90, defaultVisible: false),
        .init(id: ActionIDs.aiJSONSchema, title: "Convert to JSON Schema", systemImageName: "curlybraces.square", defaultCategory: .ai, supportedContexts: [.file], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 100, defaultVisible: false),
        .init(id: ActionIDs.aiCommitMessage, title: "Draft Commit Message", systemImageName: "text.redaction", defaultCategory: .ai, supportedContexts: [.folder, .empty, .multi], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 110, defaultVisible: false),
        .init(id: ActionIDs.aiPRSummary, title: "Draft PR Summary", systemImageName: "rectangle.and.pencil.and.ellipsis", defaultCategory: .ai, supportedContexts: [.folder, .empty, .multi], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 120, defaultVisible: false),
        .init(id: ActionIDs.aiSummarizeSelection, title: "AI Summarize Selection", systemImageName: "sparkles.rectangle.stack", defaultCategory: .ai, supportedContexts: [.multi], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 130, defaultVisible: false),
        .init(id: ActionIDs.aiAskSelection, title: "AI Ask About Selection", systemImageName: "questionmark.bubble", defaultCategory: .ai, supportedContexts: [.multi], implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 140, defaultVisible: false),
        .init(id: ActionIDs.repeatLastAIAction, title: "Repeat Last AI Action", systemImageName: "arrow.clockwise.circle", defaultCategory: .ai, supportedContexts: SelectionKind.allCases, implementationStatus: .planned, requirements: .init(requiresAI: true), defaultOrder: 150, defaultVisible: false),
        .init(id: "submenu.scripts", title: "Scripts", systemImageName: "terminal", defaultCategory: .scripts, supportedContexts: SelectionKind.allCases, implementationStatus: .beta, defaultOrder: 0, defaultVisible: true, childrenPolicy: .scripts),
        .init(id: ActionIDs.showHidden, title: "Show Hidden Files Here", systemImageName: "eye.slash", defaultCategory: .view, supportedContexts: [.file, .folder, .empty], implementationStatus: .beta, requirements: .init(requiresDirectoryContext: true), defaultOrder: 10),
        .init(id: ActionIDs.refresh, title: "Refresh Finder Window", systemImageName: "arrow.clockwise", defaultCategory: .view, supportedContexts: SelectionKind.allCases, implementationStatus: .beta, defaultOrder: 20),
        .init(id: ActionIDs.searchInFolder, title: "Search in Folder", systemImageName: "magnifyingglass", defaultCategory: .view, supportedContexts: [.folder, .empty], implementationStatus: .planned, defaultOrder: 30, defaultVisible: false),
        .init(id: ActionIDs.folderSize, title: "Folder Size", systemImageName: "internaldrive", defaultCategory: .view, supportedContexts: [.folder, .empty], implementationStatus: .planned, defaultOrder: 40, defaultVisible: false),
        .init(id: ActionIDs.countItems, title: "Count Items", systemImageName: "number", defaultCategory: .view, supportedContexts: [.folder, .empty], implementationStatus: .planned, defaultOrder: 50, defaultVisible: false),
        .init(id: ActionIDs.batchRename, title: "Batch Rename", systemImageName: "character.cursor.ibeam", defaultCategory: .fileOps, supportedContexts: [.multi], implementationStatus: .planned, defaultOrder: 60, defaultVisible: false)
    ]

    public static func definition(for id: String) -> ActionDefinition? {
        allDefinitions.first { $0.id == id }
    }

    public static func runtimeDefinitions(settings: AppSettings) -> [ActionDefinition] {
        allDefinitions + ActionMenuBuilder.customOpenActionDefinitions(settings: settings)
    }

    public static func title(for id: String) -> String {
        if let definition = definition(for: id) {
            return definition.title
        }
        if id.hasPrefix(ActionIDs.newFromTemplatePrefix) {
            let templateID = String(id.dropFirst(ActionIDs.newFromTemplatePrefix.count))
            if let template = BuiltInTemplates.all.first(where: { $0.id == templateID }) {
                return template.title
            }
            if templateID.hasPrefix("user.") {
                return String(templateID.dropFirst("user.".count))
            }
        }
        if id.hasPrefix("script.run.") {
            return String(id.dropFirst("script.run.".count))
        }
        if id.hasPrefix("open.custom.") {
            return String(id.dropFirst("open.custom.".count))
        }
        return id
    }
}

public enum ActionAvailabilityEvaluator {
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
            if !settings.aiEnabled {
                return .init(isVisible: false, isEnabled: false, disabledReason: "AI 已禁用")
            }
            if !settings.aiActionVisibility.contains(definition.id) {
                return .init(isVisible: false, isEnabled: false, disabledReason: "AI 动作未启用")
            }
            if !hasAvailableAIBackend(context: context, settings: settings, definition: definition) {
                return .init(isVisible: settings.contextMenu.showUnavailableInPreview, isEnabled: false, disabledReason: "未检测到可用 AI")
            }
        }
        if let requiredTool = definition.requirements.requiredTool {
            let toolPreference = settings.toolPreferences.first { $0.kind == requiredTool }
            guard toolPreference?.allowMenuActions ?? true else {
                return .init(isVisible: false, isEnabled: false, disabledReason: "工具动作已禁用")
            }
            guard context.detectedTools[requiredTool]?.isInstalled == true else {
                return .init(isVisible: settings.contextMenu.showUnavailableInPreview, isEnabled: false, disabledReason: "未检测到 \(requiredTool.rawValue)")
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

    private static func hasAvailableAIBackend(context: FinderActionContext, settings: AppSettings, definition: ActionDefinition) -> Bool {
        if definition.id == ActionIDs.aiAskClaude {
            return context.detectedTools[.claude]?.isInstalled == true || !settings.apiKey.isEmpty
        }
        if definition.id == ActionIDs.aiAskCodex {
            return context.detectedTools[.codex]?.isInstalled == true || !settings.apiKey.isEmpty
        }
        return context.detectedTools[.claude]?.isInstalled == true
            || context.detectedTools[.codex]?.isInstalled == true
            || !settings.apiKey.isEmpty
    }
}

public enum ActionMenuBuilder {
    public static func build(context: FinderActionContext, settings: AppSettings, includeUnavailable: Bool = false) -> [ActionDescriptor] {
        let categories = ActionCatalog.categoryDefinitions.sorted { lhs, rhs in
            let left = ActionAvailabilityEvaluator.categorySetting(for: lhs.category, settings: settings)?.order ?? lhs.defaultOrder
            let right = ActionAvailabilityEvaluator.categorySetting(for: rhs.category, settings: settings)?.order ?? rhs.defaultOrder
            return left < right
        }

        var output: [ActionDescriptor] = []

        for category in categories {
            guard ActionAvailabilityEvaluator.categorySetting(for: category.category, settings: settings)?.isEnabled ?? true else {
                continue
            }
            let displayStyle = ActionAvailabilityEvaluator.categorySetting(for: category.category, settings: settings)?.displayStyle ?? category.defaultDisplayStyle
            let actions = actions(for: category.category, context: context, settings: settings, includeUnavailable: includeUnavailable)
            guard !actions.isEmpty else { continue }

            if displayStyle == .inline || (settings.contextMenu.collapseSingleActionGroups && actions.count == 1) {
                output.append(contentsOf: actions)
            } else {
                output.append(
                    ActionDescriptor(
                        id: "category.\(category.category.rawValue)",
                        title: category.title,
                        systemImageName: category.systemImageName,
                        category: category.category,
                        supportedContexts: SelectionKind.allCases,
                        children: actions,
                        isEnabled: true
                    )
                )
            }
        }

        return output
    }

    public static func previewLines(context: FinderActionContext, settings: AppSettings) -> [String] {
        build(context: context, settings: settings, includeUnavailable: settings.contextMenu.showUnavailableInPreview).flatMap { descriptor in
            previewLines(for: descriptor)
        }
    }

    private static func previewLines(for descriptor: ActionDescriptor, level: Int = 0) -> [String] {
        let prefix = String(repeating: "  ", count: level)
        let label = descriptor.statusBadge.map { "\(descriptor.title) [\($0)]" } ?? descriptor.title
        if descriptor.children.isEmpty {
            return ["\(prefix)- \(label)"]
        }
        return ["\(prefix)- \(label)"] + descriptor.children.flatMap { previewLines(for: $0, level: level + 1) }
    }

    private static func actions(for category: ActionCategory, context: FinderActionContext, settings: AppSettings, includeUnavailable: Bool) -> [ActionDescriptor] {
        let definitions = (ActionCatalog.allDefinitions + customOpenActionDefinitions(settings: settings))
            .filter { ActionAvailabilityEvaluator.resolvedCategory(for: $0, settings: settings) == category }
            .sorted { ActionAvailabilityEvaluator.resolvedOrder(for: $0, settings: settings) < ActionAvailabilityEvaluator.resolvedOrder(for: $1, settings: settings) }

        return definitions.compactMap { definition in
            let availability = ActionAvailabilityEvaluator.evaluate(definition: definition, context: context, settings: settings)
            guard availability.isVisible || includeUnavailable else { return nil }
            return descriptor(for: definition, context: context, settings: settings, availability: availability, includeUnavailable: includeUnavailable)
        }
    }

    private static func descriptor(
        for definition: ActionDefinition,
        context: FinderActionContext,
        settings: AppSettings,
        availability: ActionAvailability,
        includeUnavailable: Bool
    ) -> ActionDescriptor? {
        let children: [ActionDescriptor]
        switch definition.childrenPolicy {
        case .none:
            children = []
        case .builtInTemplates:
            children = templateChildren(context: context, settings: settings, includeUnavailable: includeUnavailable)
        case .scripts:
            children = scriptChildren(context: context, settings: settings, includeUnavailable: includeUnavailable)
        }
        if definition.childrenPolicy != .none && children.isEmpty {
            return nil
        }
        let badge = availability.isEnabled ? nil : availability.disabledReason
        return ActionDescriptor(
            id: definition.id,
            title: definition.title,
            systemImageName: definition.systemImageName,
            category: ActionAvailabilityEvaluator.resolvedCategory(for: definition, settings: settings),
            supportedContexts: definition.supportedContexts,
            executionMode: definition.executionMode,
            children: children,
            statusBadge: badge,
            isEnabled: availability.isEnabled
        )
    }

    private static func templateChildren(context: FinderActionContext, settings: AppSettings, includeUnavailable: Bool) -> [ActionDescriptor] {
        let definitions = RuntimeTemplates.all(settings: settings).map { template in
            ActionDefinition(
                id: ActionIDs.newFromTemplatePrefix + template.id,
                title: template.title,
                systemImageName: "doc.badge.plus",
                defaultCategory: .create,
                supportedContexts: [.file, .folder, .empty],
                implementationStatus: .implemented,
                requirements: .init(requiresWritableTarget: true, requiresDirectoryContext: true),
                defaultOrder: 1000
            )
        }
        return definitions.compactMap { definition in
            let availability = ActionAvailabilityEvaluator.evaluate(definition: definition, context: context, settings: settings)
            guard availability.isVisible || includeUnavailable else { return nil }
            return ActionDescriptor(
                id: definition.id,
                title: definition.title,
                systemImageName: definition.systemImageName,
                category: .create,
                supportedContexts: definition.supportedContexts,
                statusBadge: availability.isEnabled ? nil : availability.disabledReason,
                isEnabled: availability.isEnabled
            )
        }
    }

    private static func scriptChildren(context: FinderActionContext, settings: AppSettings, includeUnavailable: Bool) -> [ActionDescriptor] {
        let urls = (try? FileManager.default.contentsOfDirectory(at: SharedPaths.scriptsDirectory(), includingPropertiesForKeys: nil)) ?? []
        return urls
            .filter { $0.pathExtension != "" || FileManager.default.isExecutableFile(atPath: $0.path) }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
            .map {
                ActionDescriptor(
                    id: "script.run.\($0.lastPathComponent)",
                    title: $0.deletingPathExtension().lastPathComponent,
                    systemImageName: "terminal",
                    category: .scripts,
                    supportedContexts: SelectionKind.allCases,
                    statusBadge: includeUnavailable && context.workingDirectoryURL == nil ? "缺少工作目录" : nil,
                    isEnabled: context.workingDirectoryURL != nil
                )
            }
    }

    static func customOpenActionDefinitions(settings: AppSettings) -> [ActionDefinition] {
        settings.customActions.openActions
            .filter(\.isEnabled)
            .sorted { $0.sortOrder < $1.sortOrder }
            .map { item in
                let supportedContexts: [SelectionKind]
                switch item.targetKind {
                case "file":
                    supportedContexts = [.file, .mixed, .multi]
                case "folder":
                    supportedContexts = [.folder, .empty, .mixed, .multi]
                default:
                    supportedContexts = SelectionKind.allCases
                }
                return ActionDefinition(
                    id: "open.custom.\(item.id)",
                    title: item.name,
                    systemImageName: "app.badge",
                    defaultCategory: item.category,
                    supportedContexts: supportedContexts,
                    implementationStatus: .implemented,
                    defaultOrder: 1000 + item.sortOrder,
                    defaultVisible: true
                )
            }
    }
}

public enum ActionRegistry {
    public static func topLevelActions(context: FinderActionContext, settings: AppSettings) -> [ActionDescriptor] {
        ActionMenuBuilder.build(context: context, settings: settings)
    }

    public static func snapshotAvailability(context: FinderActionContext, settings: AppSettings) -> [FinderMenuSnapshotAvailability] {
        ActionCatalog.runtimeDefinitions(settings: settings)
            .sorted { lhs, rhs in
                ActionAvailabilityEvaluator.resolvedOrder(for: lhs, settings: settings) < ActionAvailabilityEvaluator.resolvedOrder(for: rhs, settings: settings)
            }
            .map { definition in
                let availability = ActionAvailabilityEvaluator.evaluate(definition: definition, context: context, settings: settings)
                return FinderMenuSnapshotAvailability(
                    actionID: definition.id,
                    title: definition.title,
                    isVisible: availability.isVisible,
                    isEnabled: availability.isEnabled,
                    reason: availability.disabledReason
                )
            }
    }
}
