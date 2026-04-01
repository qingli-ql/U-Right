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
        aiActionVisibility: [String] = []
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
        normalizeDerivedSettings()
    }

    public mutating func normalizeDerivedSettings() {
        if contextMenu.categorySettings.isEmpty {
            contextMenu.categorySettings = ActionCatalog.categoryDefinitions.map {
                MenuCategorySettings(
                    category: $0.category,
                    isEnabled: true,
                    order: $0.defaultOrder,
                    displayStyle: $0.defaultDisplayStyle
                )
            }
        }
        if contextMenu.actionSettings.isEmpty {
            contextMenu.actionSettings = ActionCatalog.allDefinitions.map {
                MenuActionSettings(
                    actionID: $0.id,
                    isEnabled: $0.defaultVisible,
                    categoryOverride: nil,
                    orderOverride: nil
                )
            }
        }
        if toolPreferences.isEmpty {
            toolPreferences = ToolKind.allCases.map { ToolPreference(kind: $0) }
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
    private let currentDocumentVersion = 1

    public init(defaults: UserDefaults? = nil) {
        let hasAppGroupContainer = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: URightConstants.appGroupIdentifier) != nil
        if hasAppGroupContainer {
            self.defaults = defaults ?? UserDefaults(suiteName: URightConstants.appGroupIdentifier)
        } else {
            self.defaults = nil
        }
        self.fileURL = SharedPaths.appGroupContainerURL().appendingPathComponent(URightConstants.settingsFileName)
        self.backupURL = SharedPaths.appGroupContainerURL().appendingPathComponent(URightConstants.settingsBackupFileName)
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    }

    public func load() -> AppSettings {
        if let settings = loadFromDisk(url: fileURL) {
            return settings
        }
        if let settings = loadFromDisk(url: backupURL) {
            save(settings)
            return settings
        }
        if let defaults,
           let data = defaults.data(forKey: key),
           let settings = decodeSettings(from: data) {
            save(settings)
            return settings
        }
        let settings = AppSettings()
        save(settings)
        return settings
    }

    public func save(_ settings: AppSettings) {
        let document = StoredSettingsDocument(version: currentDocumentVersion, updatedAt: .now, settings: settings)
        guard let data = try? encoder.encode(document) else { return }
        if let defaults {
            defaults.set(try? encoder.encode(settings), forKey: key)
        }
        if let existing = try? Data(contentsOf: fileURL) {
            try? existing.write(to: backupURL, options: .atomic)
        }
        try? data.write(to: fileURL, options: .atomic)
    }

    private func loadFromDisk(url: URL) -> AppSettings? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return decodeSettings(from: data)
    }

    private func decodeSettings(from data: Data) -> AppSettings? {
        if let document = try? decoder.decode(StoredSettingsDocument.self, from: data) {
            return document.settings
        }
        return try? decoder.decode(AppSettings.self, from: data)
    }
}
