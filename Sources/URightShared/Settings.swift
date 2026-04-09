import Foundation

public struct MenuCategorySettings: Codable, Hashable, Sendable {
    public var category: ActionCategory
    public var isEnabled: Bool
    public var order: Int
    public var displayStyle: MenuCategoryDisplayStyle

    public init(
        category: ActionCategory,
        isEnabled: Bool = true,
        order: Int,
        displayStyle: MenuCategoryDisplayStyle = .submenu
    ) {
        self.category = category
        self.isEnabled = isEnabled
        self.order = order
        self.displayStyle = displayStyle
    }
}

public struct MenuActionSettings: Codable, Hashable, Sendable {
    public var actionID: String
    public var isEnabled: Bool
    public var categoryOverride: ActionCategory?
    public var orderOverride: Int?

    public init(
        actionID: String,
        isEnabled: Bool = true,
        categoryOverride: ActionCategory? = nil,
        orderOverride: Int? = nil
    ) {
        self.actionID = actionID
        self.isEnabled = isEnabled
        self.categoryOverride = categoryOverride
        self.orderOverride = orderOverride
    }
}

public struct ContextMenuSettings: Codable, Hashable, Sendable {
    public var categorySettings: [MenuCategorySettings]
    public var actionSettings: [MenuActionSettings]
    public var collapseSingleActionGroups: Bool
    public var showUnavailableInPreview: Bool

    public init(
        categorySettings: [MenuCategorySettings] = [],
        actionSettings: [MenuActionSettings] = [],
        collapseSingleActionGroups: Bool = true,
        showUnavailableInPreview: Bool = false
    ) {
        self.categorySettings = categorySettings
        self.actionSettings = actionSettings
        self.collapseSingleActionGroups = collapseSingleActionGroups
        self.showUnavailableInPreview = showUnavailableInPreview
    }
}

public struct ToolPreference: Codable, Hashable, Sendable {
    public var kind: ToolKind
    public var customPath: String
    public var allowMenuActions: Bool

    public init(kind: ToolKind, customPath: String = "", allowMenuActions: Bool = true) {
        self.kind = kind
        self.customPath = customPath
        self.allowMenuActions = allowMenuActions
    }
}

public struct AppSettings: Codable, Sendable {
    public var pinnedActionIDs: [String]
    public var recentActionIDs: [String]
    public var lastAIActionID: String?
    public var contextMenu: ContextMenuSettings
    public var general: GeneralSettings
    public var integrations: IntegrationSettings
    public var templates: TemplateSettings
    public var ai: AISettings
    public var customActions: CustomActionSettings
    public var advanced: AdvancedSettings

    public init(
        pinnedActionIDs: [String] = [],
        recentActionIDs: [String] = [],
        lastAIActionID: String? = nil,
        contextMenu: ContextMenuSettings = .init(),
        general: GeneralSettings = .init(),
        integrations: IntegrationSettings = .init(),
        templates: TemplateSettings = .init(),
        ai: AISettings = .init(),
        customActions: CustomActionSettings = .init(),
        advanced: AdvancedSettings = .init()
    ) {
        self.pinnedActionIDs = pinnedActionIDs
        self.recentActionIDs = recentActionIDs
        self.lastAIActionID = lastAIActionID
        self.contextMenu = contextMenu
        self.general = general
        self.integrations = integrations
        self.templates = templates
        self.ai = ai
        self.customActions = customActions
        self.advanced = advanced
        normalizeV3(sourceVersion: 3)
    }

    public var activeAIProfile: AIProfile? {
        ai.profiles.first(where: { $0.id == ai.defaultProfileID && $0.isEnabled })
            ?? ai.profiles.first(where: \.isEnabled)
            ?? ai.profiles.first
    }

    public var activePromptPolicy: PromptPolicy? {
        ai.promptPolicies.first(where: { $0.id == ai.defaultPromptPolicyID })
            ?? ai.promptPolicies.first
    }

    public mutating func normalizeV3(sourceVersion: Int) {
        if integrations.toolPreferences.isEmpty {
            integrations.toolPreferences = ToolKind.allCases.map { ToolPreference(kind: $0) }
        }
        if ai.profiles.isEmpty {
            ai.profiles = [Self.defaultAIProfile()]
        }
        if ai.defaultProfileID == nil || !ai.profiles.contains(where: { $0.id == ai.defaultProfileID }) {
            ai.defaultProfileID = ai.profiles.first?.id
        }
        if ai.promptPolicies.isEmpty {
            ai.promptPolicies = Self.defaultPromptPolicies()
        }
        if ai.defaultPromptPolicyID == nil || !ai.promptPolicies.contains(where: { $0.id == ai.defaultPromptPolicyID }) {
            ai.defaultPromptPolicyID = ai.promptPolicies.first?.id
        }

        let defaultCategorySettings = makeDefaultCategorySettings()
        let defaultActionSettings = makeDefaultActionSettings()
        if contextMenu.categorySettings.isEmpty {
            contextMenu.categorySettings = defaultCategorySettings
        } else {
            let existingByCategory = Dictionary(uniqueKeysWithValues: contextMenu.categorySettings.map { ($0.category, $0) })
            contextMenu.categorySettings = defaultCategorySettings.map { defaultSetting in
                existingByCategory[defaultSetting.category] ?? defaultSetting
            }
        }
        if contextMenu.actionSettings.isEmpty {
            contextMenu.actionSettings = defaultActionSettings
        } else {
            let existingByActionID = Dictionary(uniqueKeysWithValues: contextMenu.actionSettings.map { ($0.actionID, $0) })
            contextMenu.actionSettings = defaultActionSettings.map { defaultSetting in
                existingByActionID[defaultSetting.actionID] ?? defaultSetting
            }
        }
        for index in integrations.toolPreferences.indices {
            let key = integrations.toolPreferences[index].kind.rawValue
            if integrations.toolPreferences[index].customPath.isEmpty, let existing = integrations.customExecutablePaths[key], !existing.isEmpty {
                integrations.toolPreferences[index].customPath = existing
            }
            if !integrations.toolPreferences[index].customPath.isEmpty {
                integrations.customExecutablePaths[key] = integrations.toolPreferences[index].customPath
            }
        }
        if ai.actionVisibility.isEmpty {
            ai.actionVisibility = ActionCatalog.defaultVisibleAIActionIDs
        }

        if sourceVersion < 2 {
            let existingActionSettings = Dictionary(uniqueKeysWithValues: contextMenu.actionSettings.map { ($0.actionID, $0) })
            for group in ActionCatalog.promotedVisibilityGroups {
                let previousGroupSettings = group.map { existingActionSettings[$0] }
                let shouldPromoteWholeGroup = previousGroupSettings.allSatisfy { item in
                    guard let item else { return false }
                    return item.isEnabled == false && item.categoryOverride == nil && item.orderOverride == nil
                }
                if shouldPromoteWholeGroup {
                    contextMenu.actionSettings = contextMenu.actionSettings.map { item in
                        group.contains(item.actionID)
                            ? MenuActionSettings(actionID: item.actionID, isEnabled: true, categoryOverride: item.categoryOverride, orderOverride: item.orderOverride)
                            : item
                    }
                }
            }
        }
    }

    enum CodingKeys: String, CodingKey {
        case pinnedActionIDs
        case recentActionIDs
        case lastAIActionID
        case contextMenu
        case general
        case integrations
        case templates
        case ai
        case customActions
        case advanced
    }

    private enum LegacyCodingKeys: String, CodingKey {
        case launchAtLogin
        case showMenuBarIcon
        case showExtensionStatus
        case defaultTerminal
        case defaultEditor
        case aiEnabled
        case preferredAIProvider
        case apiBaseURL
        case apiKey
        case apiModel
        case systemPromptTemplate
        case maxContextFileSize
        case maxFolderScanDepth
        case includeHiddenFiles
        case customTemplateFolder
        case debugLogging
        case customExecutablePaths
        case toolPreferences
        case aiActionVisibility
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let legacy = try decoder.container(keyedBy: LegacyCodingKeys.self)

        pinnedActionIDs = try container.decodeIfPresent([String].self, forKey: .pinnedActionIDs) ?? []
        recentActionIDs = try container.decodeIfPresent([String].self, forKey: .recentActionIDs) ?? []
        lastAIActionID = try container.decodeIfPresent(String.self, forKey: .lastAIActionID)
        contextMenu = try container.decodeIfPresent(ContextMenuSettings.self, forKey: .contextMenu) ?? .init()
        general = try container.decodeIfPresent(GeneralSettings.self, forKey: .general) ?? .init(
            launchAtLogin: try legacy.decodeIfPresent(Bool.self, forKey: .launchAtLogin) ?? false,
            showMenuBarIcon: try legacy.decodeIfPresent(Bool.self, forKey: .showMenuBarIcon) ?? true,
            showExtensionStatus: try legacy.decodeIfPresent(Bool.self, forKey: .showExtensionStatus) ?? true
        )
        integrations = try container.decodeIfPresent(IntegrationSettings.self, forKey: .integrations) ?? .init(
            defaultTerminal: try legacy.decodeIfPresent(ToolKind.self, forKey: .defaultTerminal) ?? .terminal,
            defaultEditor: try legacy.decodeIfPresent(ToolKind.self, forKey: .defaultEditor) ?? .vscode,
            toolPreferences: try legacy.decodeIfPresent([ToolPreference].self, forKey: .toolPreferences) ?? [],
            customExecutablePaths: try legacy.decodeIfPresent([String: String].self, forKey: .customExecutablePaths) ?? [:]
        )
        templates = try container.decodeIfPresent(TemplateSettings.self, forKey: .templates) ?? .init(
            customTemplateFolder: try legacy.decodeIfPresent(String.self, forKey: .customTemplateFolder) ?? "",
            userTemplates: [],
            extensionDefaults: []
        )
        ai = try container.decodeIfPresent(AISettings.self, forKey: .ai) ?? .init(
            enabled: try legacy.decodeIfPresent(Bool.self, forKey: .aiEnabled) ?? true,
            preferredProvider: try legacy.decodeIfPresent(AIProvider.self, forKey: .preferredAIProvider) ?? .auto,
            profiles: [],
            defaultProfileID: nil,
            promptPolicies: [],
            defaultPromptPolicyID: nil,
            actionVisibility: try legacy.decodeIfPresent([String].self, forKey: .aiActionVisibility) ?? []
        )
        customActions = try container.decodeIfPresent(CustomActionSettings.self, forKey: .customActions) ?? .init()
        advanced = try container.decodeIfPresent(AdvancedSettings.self, forKey: .advanced) ?? .init(
            debugLogging: try legacy.decodeIfPresent(Bool.self, forKey: .debugLogging) ?? false
        )

        let legacyCustomExecutablePaths = try legacy.decodeIfPresent([String: String].self, forKey: .customExecutablePaths) ?? [:]
        integrations.customExecutablePaths.merge(legacyCustomExecutablePaths, uniquingKeysWith: { current, _ in current })

        if templates.customTemplateFolder.isEmpty {
            templates.customTemplateFolder = try legacy.decodeIfPresent(String.self, forKey: .customTemplateFolder) ?? ""
        }

        if ai.profiles.isEmpty {
            ai.profiles = [Self.legacyOrDefaultAIProfile(from: legacy)]
        }
        if ai.defaultProfileID == nil {
            ai.defaultProfileID = ai.profiles.first?.id
        }
        if ai.promptPolicies.isEmpty {
            ai.promptPolicies = [Self.legacyOrDefaultPromptPolicy(from: legacy)]
        }
        if ai.defaultPromptPolicyID == nil {
            ai.defaultPromptPolicyID = ai.promptPolicies.first?.id
        }
    }

    private static func defaultAIProfile() -> AIProfile {
        AIProfile(
            id: "default-openai-compatible",
            name: "Default OpenAI-Compatible",
            provider: .openAICompatible,
            apiBaseURL: "https://api.openai.com/v1",
            apiKey: "",
            apiModel: "gpt-4.1-mini"
        )
    }

    private static func defaultPromptPolicies() -> [PromptPolicy] {
        [
            PromptPolicy(
                id: "legacy-default",
                name: "Legacy Default",
                systemPromptTemplate: "You are a precise macOS power-user assistant.",
                maxContextFileSize: 64_000,
                maxFolderScanDepth: 3,
                includeHiddenFiles: false
            )
        ]
    }

    private static func legacyOrDefaultAIProfile(from legacy: KeyedDecodingContainer<LegacyCodingKeys>) -> AIProfile {
        AIProfile(
            id: "default-openai-compatible",
            name: "Default OpenAI-Compatible",
            provider: (try? legacy.decodeIfPresent(AIProvider.self, forKey: .preferredAIProvider)) ?? .openAICompatible,
            apiBaseURL: (try? legacy.decodeIfPresent(String.self, forKey: .apiBaseURL)) ?? "https://api.openai.com/v1",
            apiKey: (try? legacy.decodeIfPresent(String.self, forKey: .apiKey)) ?? "",
            apiModel: (try? legacy.decodeIfPresent(String.self, forKey: .apiModel)) ?? "gpt-4.1-mini"
        )
    }

    private static func legacyOrDefaultPromptPolicy(from legacy: KeyedDecodingContainer<LegacyCodingKeys>) -> PromptPolicy {
        PromptPolicy(
            id: "legacy-default",
            name: "Legacy Default",
            systemPromptTemplate: (try? legacy.decodeIfPresent(String.self, forKey: .systemPromptTemplate)) ?? "You are a precise macOS power-user assistant.",
            maxContextFileSize: (try? legacy.decodeIfPresent(Int.self, forKey: .maxContextFileSize)) ?? 64_000,
            maxFolderScanDepth: (try? legacy.decodeIfPresent(Int.self, forKey: .maxFolderScanDepth)) ?? 3,
            includeHiddenFiles: (try? legacy.decodeIfPresent(Bool.self, forKey: .includeHiddenFiles)) ?? false
        )
    }
}

private struct StoredSettingsV3Document: Codable {
    var version: Int
    var updatedAt: Date
    var settings: AppSettings
}

public final class SettingsStore: @unchecked Sendable {
    public static let shared = SettingsStore()

    private let defaults: UserDefaults?
    private let fileURL: URL
    private let backupURL: URL
    private let key = "AppSettings"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let currentDocumentVersion = 3

    public init(defaults: UserDefaults? = nil) {
        let appGroupIdentifier = URightConstants.appGroupIdentifier
        self.defaults = defaults ?? UserDefaults(suiteName: appGroupIdentifier)
        self.fileURL = SharedPaths.appGroupContainerURL().appendingPathComponent(URightConstants.settingsFileName)
        self.backupURL = SharedPaths.appGroupContainerURL().appendingPathComponent(URightConstants.settingsBackupFileName)
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    }

    public func load() -> AppSettings {
        if let payload = loadDocumentPayload(url: fileURL) {
            if payload.didNormalize {
                save(payload.settings)
            }
            return payload.settings
        }
        if let payload = loadDocumentPayload(url: backupURL) {
            save(payload.settings)
            return payload.settings
        }
        if let defaults,
           let data = defaults.data(forKey: key),
           let settings = decodeSettings(from: data, sourceVersion: 0) {
            save(settings)
            return settings
        }
        let settings = AppSettings()
        save(settings)
        return settings
    }

    public func save(_ settings: AppSettings) {
        let normalized = normalizeSettings(settings, sourceVersion: currentDocumentVersion)
        let document = StoredSettingsV3Document(version: currentDocumentVersion, updatedAt: .now, settings: normalized)
        guard let data = try? encoder.encode(document) else { return }
        if let defaults {
            defaults.set(try? encoder.encode(normalized), forKey: key)
        }
        if let existing = try? Data(contentsOf: fileURL) {
            try? existing.write(to: backupURL, options: .atomic)
        }
        try? data.write(to: fileURL, options: .atomic)
    }

    private func loadDocumentPayload(url: URL) -> (settings: AppSettings, didNormalize: Bool)? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        if let document = try? decoder.decode(StoredSettingsV3Document.self, from: data),
           let normalized = normalizeDecodedDocument(document.settings, sourceVersion: document.version) {
            return (normalized.settings, normalized.didChange || document.version < currentDocumentVersion)
        }
        if let settings = try? decoder.decode(AppSettings.self, from: data),
           let normalized = normalizeDecodedDocument(settings, sourceVersion: 0) {
            return (normalized.settings, true)
        }
        return nil
    }

    private func decodeSettings(from data: Data, sourceVersion: Int) -> AppSettings? {
        if let document = try? decoder.decode(StoredSettingsV3Document.self, from: data) {
            return normalizeSettings(document.settings, sourceVersion: document.version)
        }
        if let settings = try? decoder.decode(AppSettings.self, from: data) {
            return normalizeSettings(settings, sourceVersion: sourceVersion)
        }
        return nil
    }

    private func normalizeDecodedDocument(_ settings: AppSettings, sourceVersion: Int) -> (settings: AppSettings, didChange: Bool)? {
        let normalized = normalizeSettings(settings, sourceVersion: sourceVersion)
        let encoder = JSONEncoder()
        guard
            let originalData = try? encoder.encode(settings),
            let normalizedData = try? encoder.encode(normalized)
        else {
            return (normalized, true)
        }
        return (normalized, originalData != normalizedData)
    }

    public func currentDocumentVersionNumber() -> Int {
        currentDocumentVersion
    }
}

private func normalizeSettings(_ settings: AppSettings, sourceVersion: Int) -> AppSettings {
    var normalized = settings
    normalized.normalizeV3(sourceVersion: sourceVersion)
    return normalized
}

private func makeDefaultCategorySettings() -> [MenuCategorySettings] {
    ActionCatalog.categoryDefinitions.map {
        MenuCategorySettings(
            category: $0.category,
            isEnabled: true,
            order: $0.defaultOrder,
            displayStyle: $0.defaultDisplayStyle
        )
    }
}

private func makeDefaultActionSettings() -> [MenuActionSettings] {
    ActionCatalog.allDefinitions.map {
        MenuActionSettings(
            actionID: $0.id,
            isEnabled: $0.defaultVisible,
            categoryOverride: nil,
            orderOverride: nil
        )
    }
}
