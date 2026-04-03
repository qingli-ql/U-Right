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
    public var launchAtLogin: Bool
    public var showMenuBarIcon: Bool
    public var showExtensionStatus: Bool
    public var defaultTerminal: ToolKind
    public var defaultEditor: ToolKind
    public var aiEnabled: Bool
    public var preferredAIProvider: AIProvider
    public var apiBaseURL: String
    public var apiKey: String
    public var apiModel: String
    public var systemPromptTemplate: String
    public var maxContextFileSize: Int
    public var maxFolderScanDepth: Int
    public var includeHiddenFiles: Bool
    public var customTemplateFolder: String
    public var debugLogging: Bool
    public var customExecutablePaths: [String: String]
    public var pinnedActionIDs: [String]
    public var recentActionIDs: [String]
    public var lastAIActionID: String?
    public var contextMenu: ContextMenuSettings
    public var toolPreferences: [ToolPreference]
    public var aiActionVisibility: [String]
    public var general: GeneralSettings
    public var integrations: IntegrationSettings
    public var templates: TemplateSettings
    public var ai: AISettings
    public var customActions: CustomActionSettings
    public var advanced: AdvancedSettings

    public init(
        launchAtLogin: Bool = false,
        showMenuBarIcon: Bool = true,
        showExtensionStatus: Bool = true,
        defaultTerminal: ToolKind = .terminal,
        defaultEditor: ToolKind = .vscode,
        aiEnabled: Bool = true,
        preferredAIProvider: AIProvider = .auto,
        apiBaseURL: String = "https://api.openai.com/v1",
        apiKey: String = "",
        apiModel: String = "gpt-4.1-mini",
        systemPromptTemplate: String = "You are a precise macOS power-user assistant.",
        maxContextFileSize: Int = 64_000,
        maxFolderScanDepth: Int = 3,
        includeHiddenFiles: Bool = false,
        customTemplateFolder: String = "",
        debugLogging: Bool = false,
        customExecutablePaths: [String: String] = [:],
        pinnedActionIDs: [String] = [],
        recentActionIDs: [String] = [],
        lastAIActionID: String? = nil,
        contextMenu: ContextMenuSettings = .init(),
        toolPreferences: [ToolPreference] = ToolKind.allCases.map { ToolPreference(kind: $0) },
        aiActionVisibility: [String] = [],
        general: GeneralSettings = .init(),
        integrations: IntegrationSettings = .init(),
        templates: TemplateSettings = .init(),
        ai: AISettings = .init(),
        customActions: CustomActionSettings = .init(),
        advanced: AdvancedSettings = .init()
    ) {
        self.launchAtLogin = launchAtLogin
        self.showMenuBarIcon = showMenuBarIcon
        self.showExtensionStatus = showExtensionStatus
        self.defaultTerminal = defaultTerminal
        self.defaultEditor = defaultEditor
        self.aiEnabled = aiEnabled
        self.preferredAIProvider = preferredAIProvider
        self.apiBaseURL = apiBaseURL
        self.apiKey = apiKey
        self.apiModel = apiModel
        self.systemPromptTemplate = systemPromptTemplate
        self.maxContextFileSize = maxContextFileSize
        self.maxFolderScanDepth = maxFolderScanDepth
        self.includeHiddenFiles = includeHiddenFiles
        self.customTemplateFolder = customTemplateFolder
        self.debugLogging = debugLogging
        self.customExecutablePaths = customExecutablePaths
        self.pinnedActionIDs = pinnedActionIDs
        self.recentActionIDs = recentActionIDs
        self.lastAIActionID = lastAIActionID
        self.contextMenu = contextMenu
        self.toolPreferences = toolPreferences
        self.aiActionVisibility = aiActionVisibility
        self.general = general
        self.integrations = integrations
        self.templates = templates
        self.ai = ai
        self.customActions = customActions
        self.advanced = advanced
        normalizeDerivedSettings()
    }

    public mutating func normalizeDerivedSettings() {
        general.launchAtLogin = launchAtLogin
        general.showMenuBarIcon = showMenuBarIcon
        general.showExtensionStatus = showExtensionStatus

        integrations.defaultTerminal = defaultTerminal
        integrations.defaultEditor = defaultEditor
        integrations.customExecutablePaths.merge(customExecutablePaths, uniquingKeysWith: { _, new in new })
        if integrations.toolPreferences.isEmpty {
            integrations.toolPreferences = ToolKind.allCases.map { ToolPreference(kind: $0) }
        }

        templates.customTemplateFolder = customTemplateFolder

        ai.enabled = aiEnabled
        ai.preferredProvider = preferredAIProvider
        ai.actionVisibility = aiActionVisibility
        if ai.profiles.isEmpty {
            ai.profiles = [
                AIProfile(
                    id: "default-openai-compatible",
                    name: "Default OpenAI-Compatible",
                    provider: .openAICompatible,
                    apiBaseURL: apiBaseURL,
                    apiKey: apiKey,
                    apiModel: apiModel
                )
            ]
            ai.defaultProfileID = ai.profiles.first?.id
        }
        if ai.promptPolicies.isEmpty {
            ai.promptPolicies = [
                PromptPolicy(
                    id: "legacy-default",
                    name: "Legacy Default",
                    systemPromptTemplate: systemPromptTemplate,
                    maxContextFileSize: maxContextFileSize,
                    maxFolderScanDepth: maxFolderScanDepth,
                    includeHiddenFiles: includeHiddenFiles
                )
            ]
            ai.defaultPromptPolicyID = ai.promptPolicies.first?.id
        }

        advanced.debugLogging = debugLogging

        let defaultCategorySettings = ActionCatalog.categoryDefinitions.map {
            MenuCategorySettings(
                category: $0.category,
                isEnabled: true,
                order: $0.defaultOrder,
                displayStyle: $0.defaultDisplayStyle
            )
        }
        let defaultActionSettings = ActionCatalog.allDefinitions.map {
            MenuActionSettings(
                actionID: $0.id,
                isEnabled: $0.defaultVisible,
                categoryOverride: nil,
                orderOverride: nil
            )
        }
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
        if toolPreferences.isEmpty {
            toolPreferences = ToolKind.allCases.map { ToolPreference(kind: $0) }
        }
        if integrations.toolPreferences.isEmpty {
            integrations.toolPreferences = toolPreferences
        }
        for index in toolPreferences.indices {
            let key = toolPreferences[index].kind.rawValue
            if toolPreferences[index].customPath.isEmpty, let existing = customExecutablePaths[key], !existing.isEmpty {
                toolPreferences[index].customPath = existing
            }
            if !toolPreferences[index].customPath.isEmpty {
                customExecutablePaths[key] = toolPreferences[index].customPath
            }
        }
        if aiActionVisibility.isEmpty {
            aiActionVisibility = ActionCatalog.defaultVisibleAIActionIDs
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

        if let activeProfile = ai.profiles.first(where: { $0.id == ai.defaultProfileID && $0.isEnabled }) ?? ai.profiles.first(where: \.isEnabled) ?? ai.profiles.first {
            preferredAIProvider = ai.preferredProvider
            apiBaseURL = activeProfile.apiBaseURL
            apiKey = activeProfile.apiKey
            apiModel = activeProfile.apiModel
        }
        if let activePolicy = ai.promptPolicies.first(where: { $0.id == ai.defaultPromptPolicyID }) ?? ai.promptPolicies.first {
            systemPromptTemplate = activePolicy.systemPromptTemplate
            maxContextFileSize = activePolicy.maxContextFileSize
            maxFolderScanDepth = activePolicy.maxFolderScanDepth
            includeHiddenFiles = activePolicy.includeHiddenFiles
        }

        launchAtLogin = general.launchAtLogin
        showMenuBarIcon = general.showMenuBarIcon
        showExtensionStatus = general.showExtensionStatus
        defaultTerminal = integrations.defaultTerminal
        defaultEditor = integrations.defaultEditor
        toolPreferences = integrations.toolPreferences
        customExecutablePaths = integrations.customExecutablePaths
        customTemplateFolder = templates.customTemplateFolder
        aiEnabled = ai.enabled
        aiActionVisibility = ai.actionVisibility.isEmpty ? ActionCatalog.defaultVisibleAIActionIDs : ai.actionVisibility
        debugLogging = advanced.debugLogging
    }

    enum CodingKeys: String, CodingKey {
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
        case pinnedActionIDs
        case recentActionIDs
        case lastAIActionID
        case contextMenu
        case toolPreferences
        case aiActionVisibility
        case general
        case integrations
        case templates
        case ai
        case customActions
        case advanced
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        launchAtLogin = try container.decodeIfPresent(Bool.self, forKey: .launchAtLogin) ?? false
        showMenuBarIcon = try container.decodeIfPresent(Bool.self, forKey: .showMenuBarIcon) ?? true
        showExtensionStatus = try container.decodeIfPresent(Bool.self, forKey: .showExtensionStatus) ?? true
        defaultTerminal = try container.decodeIfPresent(ToolKind.self, forKey: .defaultTerminal) ?? .terminal
        defaultEditor = try container.decodeIfPresent(ToolKind.self, forKey: .defaultEditor) ?? .vscode
        aiEnabled = try container.decodeIfPresent(Bool.self, forKey: .aiEnabled) ?? true
        preferredAIProvider = try container.decodeIfPresent(AIProvider.self, forKey: .preferredAIProvider) ?? .auto
        apiBaseURL = try container.decodeIfPresent(String.self, forKey: .apiBaseURL) ?? "https://api.openai.com/v1"
        apiKey = try container.decodeIfPresent(String.self, forKey: .apiKey) ?? ""
        apiModel = try container.decodeIfPresent(String.self, forKey: .apiModel) ?? "gpt-4.1-mini"
        systemPromptTemplate = try container.decodeIfPresent(String.self, forKey: .systemPromptTemplate) ?? "You are a precise macOS power-user assistant."
        maxContextFileSize = try container.decodeIfPresent(Int.self, forKey: .maxContextFileSize) ?? 64_000
        maxFolderScanDepth = try container.decodeIfPresent(Int.self, forKey: .maxFolderScanDepth) ?? 3
        includeHiddenFiles = try container.decodeIfPresent(Bool.self, forKey: .includeHiddenFiles) ?? false
        customTemplateFolder = try container.decodeIfPresent(String.self, forKey: .customTemplateFolder) ?? ""
        debugLogging = try container.decodeIfPresent(Bool.self, forKey: .debugLogging) ?? false
        customExecutablePaths = try container.decodeIfPresent([String: String].self, forKey: .customExecutablePaths) ?? [:]
        pinnedActionIDs = try container.decodeIfPresent([String].self, forKey: .pinnedActionIDs) ?? []
        recentActionIDs = try container.decodeIfPresent([String].self, forKey: .recentActionIDs) ?? []
        lastAIActionID = try container.decodeIfPresent(String.self, forKey: .lastAIActionID)
        contextMenu = try container.decodeIfPresent(ContextMenuSettings.self, forKey: .contextMenu) ?? .init()
        toolPreferences = try container.decodeIfPresent([ToolPreference].self, forKey: .toolPreferences) ?? []
        aiActionVisibility = try container.decodeIfPresent([String].self, forKey: .aiActionVisibility) ?? []
        general = try container.decodeIfPresent(GeneralSettings.self, forKey: .general) ?? .init()
        integrations = try container.decodeIfPresent(IntegrationSettings.self, forKey: .integrations) ?? .init()
        templates = try container.decodeIfPresent(TemplateSettings.self, forKey: .templates) ?? .init()
        ai = try container.decodeIfPresent(AISettings.self, forKey: .ai) ?? .init()
        customActions = try container.decodeIfPresent(CustomActionSettings.self, forKey: .customActions) ?? .init()
        advanced = try container.decodeIfPresent(AdvancedSettings.self, forKey: .advanced) ?? .init()
        normalizeDerivedSettings()
    }
}

private struct StoredSettingsDocument: Codable {
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
    private let currentDocumentVersion = 2

    public init(defaults: UserDefaults? = nil) {
        let appGroupIdentifier = URightConstants.appGroupIdentifier
        let hasAppGroupContainer = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) != nil
        if hasAppGroupContainer {
            self.defaults = defaults ?? UserDefaults(suiteName: appGroupIdentifier)
        } else {
            self.defaults = nil
        }
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
        let document = StoredSettingsDocument(version: currentDocumentVersion, updatedAt: .now, settings: normalized)
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
        if let document = try? decoder.decode(StoredSettingsDocument.self, from: data),
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
        if let document = try? decoder.decode(StoredSettingsDocument.self, from: data) {
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
    normalized.normalizeDerivedSettings()

    let defaultCategorySettings = ActionCatalog.categoryDefinitions.map {
        MenuCategorySettings(category: $0.category, isEnabled: true, order: $0.defaultOrder, displayStyle: $0.defaultDisplayStyle)
    }
    let defaultActionSettings = ActionCatalog.allDefinitions.map {
        MenuActionSettings(actionID: $0.id, isEnabled: $0.defaultVisible)
    }

    let existingCategorySettings = Dictionary(uniqueKeysWithValues: normalized.contextMenu.categorySettings.map { ($0.category, $0) })
    normalized.contextMenu.categorySettings = defaultCategorySettings.map { existingCategorySettings[$0.category] ?? $0 }

    let existingActionSettings = Dictionary(uniqueKeysWithValues: normalized.contextMenu.actionSettings.map { ($0.actionID, $0) })
    normalized.contextMenu.actionSettings = defaultActionSettings.map { existingActionSettings[$0.actionID] ?? $0 }

    if sourceVersion < 2 {
        for group in ActionCatalog.promotedVisibilityGroups {
            let previousGroupSettings = group.map { existingActionSettings[$0] }
            let shouldPromoteWholeGroup = previousGroupSettings.allSatisfy { item in
                guard let item else { return false }
                return item.isEnabled == false && item.categoryOverride == nil && item.orderOverride == nil
            }
            if shouldPromoteWholeGroup {
                normalized.contextMenu.actionSettings = normalized.contextMenu.actionSettings.map { item in
                    group.contains(item.actionID) ? MenuActionSettings(actionID: item.actionID, isEnabled: true, categoryOverride: item.categoryOverride, orderOverride: item.orderOverride) : item
                }
            }
        }
    }
    return normalized
}
