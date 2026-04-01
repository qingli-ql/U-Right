import Foundation

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
        lastAIActionID: String? = nil
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
    }
}

public final class SettingsStore: @unchecked Sendable {
    public static let shared = SettingsStore()

    private let defaults: UserDefaults
    private let key = "AppSettings"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(defaults: UserDefaults? = UserDefaults(suiteName: URightConstants.appGroupIdentifier)) {
        self.defaults = defaults ?? .standard
    }

    public func load() -> AppSettings {
        guard let data = defaults.data(forKey: key), let settings = try? decoder.decode(AppSettings.self, from: data) else {
            return AppSettings()
        }
        return settings
    }

    public func save(_ settings: AppSettings) {
        guard let data = try? encoder.encode(settings) else { return }
        defaults.set(data, forKey: key)
    }
}
