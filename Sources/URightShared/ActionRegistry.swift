import Foundation


public enum ActionCatalog {
    public static let categoryDefinitions = GeneratedActionCatalog.categoryDefinitions

    public static let defaultVisibleAIActionIDs = GeneratedActionCatalog.defaultVisibleAIActionIDs

    public static let promotedVisibilityGroups = GeneratedActionCatalog.promotedVisibilityGroups

    public static let allDefinitions = GeneratedActionCatalog.allDefinitions

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

public enum ActionMenuBuilder {
    public static func build(context: FinderActionContext, settings: AppSettings, includeUnavailable: Bool = false) -> [ActionDescriptor] {
        let categories = ActionCatalog.categoryDefinitions.sorted { lhs, rhs in
            let left = ActionAvailabilityService.categorySetting(for: lhs.category, settings: settings)?.order ?? lhs.defaultOrder
            let right = ActionAvailabilityService.categorySetting(for: rhs.category, settings: settings)?.order ?? rhs.defaultOrder
            return left < right
        }

        var output: [ActionDescriptor] = []

        for category in categories {
            guard ActionAvailabilityService.categorySetting(for: category.category, settings: settings)?.isEnabled ?? true else {
                continue
            }
            let displayStyle = ActionAvailabilityService.categorySetting(for: category.category, settings: settings)?.displayStyle ?? category.defaultDisplayStyle
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
            .filter { ActionAvailabilityService.resolvedCategory(for: $0, settings: settings) == category }
            .sorted { ActionAvailabilityService.resolvedOrder(for: $0, settings: settings) < ActionAvailabilityService.resolvedOrder(for: $1, settings: settings) }

        return definitions.compactMap { definition in
            let availability = ActionAvailabilityService.evaluate(definition: definition, context: context, settings: settings)
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
            category: ActionAvailabilityService.resolvedCategory(for: definition, settings: settings),
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
            let availability = ActionAvailabilityService.evaluate(definition: definition, context: context, settings: settings)
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
                ActionAvailabilityService.resolvedOrder(for: lhs, settings: settings) < ActionAvailabilityService.resolvedOrder(for: rhs, settings: settings)
            }
            .map { definition in
                let availability = ActionAvailabilityService.evaluate(definition: definition, context: context, settings: settings)
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
