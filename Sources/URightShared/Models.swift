import AppKit
import Foundation

public enum SelectionKind: String, Codable, CaseIterable, Sendable {
    case file
    case folder
    case mixed
    case empty
    case multi
}

public enum ActionCategory: String, Codable, CaseIterable, Sendable {
    case create
    case open
    case clipboard
    case fileOps
    case view
    case ai
    case scripts
    case templates
    case git
    case advanced
}

public enum ActionImplementationStatus: String, Codable, CaseIterable, Sendable {
    case implemented
    case beta
    case planned
    case hidden
}

public enum MenuCategoryDisplayStyle: String, Codable, CaseIterable, Sendable {
    case inline
    case submenu
}

public enum ActionChildrenPolicy: String, Codable, CaseIterable, Sendable {
    case none
    case builtInTemplates
    case scripts
}

public enum ToolKind: String, Codable, CaseIterable, Sendable {
    case terminal
    case ghostty
    case iTerm
    case vscode
    case cursor
    case zed
    case claude
    case codex
    case gh
    case lazygit
    case gitup
}

public enum AIProvider: String, Codable, CaseIterable, Sendable {
    case auto
    case claudeCLI
    case codexCLI
    case openAICompatible
}

public enum ActionExecutionMode: String, Codable, Sendable {
    case direct
    case hostApp
}

public struct FileMetadata: Codable, Hashable, Sendable {
    public var url: URL
    public var isDirectory: Bool
    public var fileSize: Int64?
    public var uti: String?
    public var fileExtension: String
    public var isScriptLike: Bool

    public init(url: URL, isDirectory: Bool, fileSize: Int64?, uti: String?, fileExtension: String, isScriptLike: Bool) {
        self.url = url
        self.isDirectory = isDirectory
        self.fileSize = fileSize
        self.uti = uti
        self.fileExtension = fileExtension
        self.isScriptLike = isScriptLike
    }
}

public struct ToolAvailability: Codable, Hashable, Sendable {
    public var kind: ToolKind
    public var isInstalled: Bool
    public var executablePath: String?
    public var appPath: String?

    public init(kind: ToolKind, isInstalled: Bool, executablePath: String? = nil, appPath: String? = nil) {
        self.kind = kind
        self.isInstalled = isInstalled
        self.executablePath = executablePath
        self.appPath = appPath
    }
}

public struct FinderActionContext: Codable, Sendable {
    public var selectedURLs: [URL]
    public var primaryURL: URL?
    public var currentDirectoryURL: URL?
    public var selectionKind: SelectionKind
    public var detectedTools: [ToolKind: ToolAvailability]
    public var fileMetadata: [FileMetadata]
    public var extensionWindowTitle: String?

    public init(selectedURLs: [URL], primaryURL: URL?, currentDirectoryURL: URL?, selectionKind: SelectionKind, detectedTools: [ToolKind: ToolAvailability], fileMetadata: [FileMetadata], extensionWindowTitle: String? = nil) {
        self.selectedURLs = selectedURLs
        self.primaryURL = primaryURL
        self.currentDirectoryURL = currentDirectoryURL
        self.selectionKind = selectionKind
        self.detectedTools = detectedTools
        self.fileMetadata = fileMetadata
        self.extensionWindowTitle = extensionWindowTitle
    }

    public var workingDirectoryURL: URL? {
        switch selectionKind {
        case .file:
            return primaryURL?.deletingLastPathComponent()
        case .folder:
            return primaryURL
        case .empty:
            return currentDirectoryURL
        case .mixed, .multi:
            return currentDirectoryURL ?? primaryURL?.deletingLastPathComponent()
        }
    }
}

public struct ActionDescriptor: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var title: String
    public var systemImageName: String
    public var category: ActionCategory
    public var supportedContexts: [SelectionKind]
    public var executionMode: ActionExecutionMode
    public var children: [ActionDescriptor]
    public var statusBadge: String?
    public var isEnabled: Bool

    public init(id: String, title: String, systemImageName: String, category: ActionCategory, supportedContexts: [SelectionKind], executionMode: ActionExecutionMode = .hostApp, children: [ActionDescriptor] = [], statusBadge: String? = nil, isEnabled: Bool = true) {
        self.id = id
        self.title = title
        self.systemImageName = systemImageName
        self.category = category
        self.supportedContexts = supportedContexts
        self.executionMode = executionMode
        self.children = children
        self.statusBadge = statusBadge
        self.isEnabled = isEnabled
    }
}

public struct ActionRequirement: Codable, Hashable, Sendable {
    public var requiredTool: ToolKind?
    public var requiresAI: Bool
    public var requiresWritableTarget: Bool
    public var requiresSingleSelection: Bool
    public var requiresDirectoryContext: Bool
    public var isDestructive: Bool
    public var needsConfirmation: Bool

    public init(
        requiredTool: ToolKind? = nil,
        requiresAI: Bool = false,
        requiresWritableTarget: Bool = false,
        requiresSingleSelection: Bool = false,
        requiresDirectoryContext: Bool = false,
        isDestructive: Bool = false,
        needsConfirmation: Bool = false
    ) {
        self.requiredTool = requiredTool
        self.requiresAI = requiresAI
        self.requiresWritableTarget = requiresWritableTarget
        self.requiresSingleSelection = requiresSingleSelection
        self.requiresDirectoryContext = requiresDirectoryContext
        self.isDestructive = isDestructive
        self.needsConfirmation = needsConfirmation
    }
}

public struct ActionDefinition: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var title: String
    public var systemImageName: String
    public var defaultCategory: ActionCategory
    public var supportedContexts: [SelectionKind]
    public var implementationStatus: ActionImplementationStatus
    public var requirements: ActionRequirement
    public var defaultOrder: Int
    public var defaultVisible: Bool
    public var childrenPolicy: ActionChildrenPolicy
    public var executionMode: ActionExecutionMode

    public init(
        id: String,
        title: String,
        systemImageName: String,
        defaultCategory: ActionCategory,
        supportedContexts: [SelectionKind],
        implementationStatus: ActionImplementationStatus = .implemented,
        requirements: ActionRequirement = .init(),
        defaultOrder: Int,
        defaultVisible: Bool = true,
        childrenPolicy: ActionChildrenPolicy = .none,
        executionMode: ActionExecutionMode = .hostApp
    ) {
        self.id = id
        self.title = title
        self.systemImageName = systemImageName
        self.defaultCategory = defaultCategory
        self.supportedContexts = supportedContexts
        self.implementationStatus = implementationStatus
        self.requirements = requirements
        self.defaultOrder = defaultOrder
        self.defaultVisible = defaultVisible
        self.childrenPolicy = childrenPolicy
        self.executionMode = executionMode
    }
}

public struct MenuCategoryDefinition: Codable, Hashable, Sendable {
    public var category: ActionCategory
    public var title: String
    public var systemImageName: String
    public var defaultOrder: Int
    public var defaultDisplayStyle: MenuCategoryDisplayStyle

    public init(
        category: ActionCategory,
        title: String,
        systemImageName: String,
        defaultOrder: Int,
        defaultDisplayStyle: MenuCategoryDisplayStyle = .submenu
    ) {
        self.category = category
        self.title = title
        self.systemImageName = systemImageName
        self.defaultOrder = defaultOrder
        self.defaultDisplayStyle = defaultDisplayStyle
    }
}

public struct ActionAvailability: Codable, Hashable, Sendable {
    public var isVisible: Bool
    public var isEnabled: Bool
    public var disabledReason: String?

    public init(isVisible: Bool, isEnabled: Bool, disabledReason: String? = nil) {
        self.isVisible = isVisible
        self.isEnabled = isEnabled
        self.disabledReason = disabledReason
    }
}

public struct AIRequest: Codable, Sendable {
    public var provider: AIProvider
    public var actionID: String
    public var prompt: String
    public var workingDirectory: URL?
    public var context: FinderActionContext

    public init(provider: AIProvider, actionID: String, prompt: String, workingDirectory: URL?, context: FinderActionContext) {
        self.provider = provider
        self.actionID = actionID
        self.prompt = prompt
        self.workingDirectory = workingDirectory
        self.context = context
    }
}

public struct ActionRequest: Codable, Identifiable, Sendable {
    public var id: UUID
    public var actionID: String
    public var context: FinderActionContext
    public var createdAt: Date

    public init(id: UUID = UUID(), actionID: String, context: FinderActionContext, createdAt: Date = .now) {
        self.id = id
        self.actionID = actionID
        self.context = context
        self.createdAt = createdAt
    }
}

public struct TemplateDescriptor: Codable, Hashable, Sendable {
    public var id: String
    public var title: String
    public var fileNameSuggestion: String
    public var fileExtension: String
    public var starterContent: String
    public var makeExecutable: Bool

    public init(id: String, title: String, fileNameSuggestion: String, fileExtension: String, starterContent: String, makeExecutable: Bool = false) {
        self.id = id
        self.title = title
        self.fileNameSuggestion = fileNameSuggestion
        self.fileExtension = fileExtension
        self.starterContent = starterContent
        self.makeExecutable = makeExecutable
    }
}

public struct LogEntry: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var timestamp: Date
    public var level: String
    public var subsystem: String
    public var message: String

    public init(id: UUID = UUID(), timestamp: Date = .now, level: String, subsystem: String, message: String) {
        self.id = id
        self.timestamp = timestamp
        self.level = level
        self.subsystem = subsystem
        self.message = message
    }
}

public enum HostCommandError: LocalizedError {
    case toolUnavailable(String)
    case invalidContext(String)
    case operationFailed(String)

    public var errorDescription: String? {
        switch self {
        case .toolUnavailable(let name):
            return "未检测到工具：\(name)"
        case .invalidContext(let message):
            return message
        case .operationFailed(let message):
            return message
        }
    }
}
