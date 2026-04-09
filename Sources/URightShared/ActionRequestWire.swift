import Foundation

public struct FileMetadataWire: Codable, Hashable, Sendable {
    public var url: String
    public var isDirectory: Bool
    public var fileSize: Int64?
    public var uti: String?
    public var fileExtension: String
    public var isScriptLike: Bool

    public init(url: String, isDirectory: Bool, fileSize: Int64?, uti: String?, fileExtension: String, isScriptLike: Bool) {
        self.url = url
        self.isDirectory = isDirectory
        self.fileSize = fileSize
        self.uti = uti
        self.fileExtension = fileExtension
        self.isScriptLike = isScriptLike
    }
}

public struct ToolAvailabilityWire: Codable, Hashable, Sendable {
    public var kind: String
    public var isInstalled: Bool
    public var executablePath: String?
    public var appPath: String?

    public init(kind: String, isInstalled: Bool, executablePath: String? = nil, appPath: String? = nil) {
        self.kind = kind
        self.isInstalled = isInstalled
        self.executablePath = executablePath
        self.appPath = appPath
    }
}

public struct FinderActionContextWire: Codable, Hashable, Sendable {
    public struct CapabilitiesWire: Codable, Hashable, Sendable {
        public var hasWorkingDirectory: Bool
        public var hasWritableTarget: Bool
        public var scriptNames: [String]

        public init(hasWorkingDirectory: Bool, hasWritableTarget: Bool, scriptNames: [String] = []) {
            self.hasWorkingDirectory = hasWorkingDirectory
            self.hasWritableTarget = hasWritableTarget
            self.scriptNames = scriptNames
        }
    }

    public var selectedURLs: [String]
    public var primaryURL: String?
    public var currentDirectoryURL: String?
    public var resolvedTargetDirectory: String?
    public var resolvedPrimaryTarget: String?
    public var resolvedSelectionDirectory: String?
    public var selectionKind: String
    public var detectedTools: [String: ToolAvailabilityWire]
    public var fileMetadata: [FileMetadataWire]
    public var extensionWindowTitle: String?
    public var capabilities: CapabilitiesWire?

    public init(
        selectedURLs: [String],
        primaryURL: String?,
        currentDirectoryURL: String?,
        resolvedTargetDirectory: String?,
        resolvedPrimaryTarget: String?,
        resolvedSelectionDirectory: String?,
        selectionKind: String,
        detectedTools: [String: ToolAvailabilityWire],
        fileMetadata: [FileMetadataWire],
        extensionWindowTitle: String?,
        capabilities: CapabilitiesWire?
    ) {
        self.selectedURLs = selectedURLs
        self.primaryURL = primaryURL
        self.currentDirectoryURL = currentDirectoryURL
        self.resolvedTargetDirectory = resolvedTargetDirectory
        self.resolvedPrimaryTarget = resolvedPrimaryTarget
        self.resolvedSelectionDirectory = resolvedSelectionDirectory
        self.selectionKind = selectionKind
        self.detectedTools = detectedTools
        self.fileMetadata = fileMetadata
        self.extensionWindowTitle = extensionWindowTitle
        self.capabilities = capabilities
    }
}

public struct ActionRequestWire: Codable, Hashable, Sendable {
    public var id: String
    public var actionID: String
    public var context: FinderActionContextWire
    public var createdAt: String

    public init(id: String, actionID: String, context: FinderActionContextWire, createdAt: String) {
        self.id = id
        self.actionID = actionID
        self.context = context
        self.createdAt = createdAt
    }
}

public enum ActionRequestWireCodec {
    private static func makeFormatter() -> ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }

    public static func encode(_ request: ActionRequest) throws -> Data {
        try JSONEncoder().encode(makeWire(request))
    }

    public static func encodeCanonicalJSON(_ request: ActionRequest) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(makeWire(request))
    }

    public static func decode(_ data: Data) throws -> ActionRequest {
        let wire = try JSONDecoder().decode(ActionRequestWire.self, from: data)
        return try decode(wire)
    }

    public static func makeWire(_ request: ActionRequest) -> ActionRequestWire {
        let formatter = makeFormatter()
        return ActionRequestWire(
            id: request.id.uuidString,
            actionID: request.actionID,
            context: FinderActionContextWire(
                selectedURLs: request.context.selectedURLs.map(\.path),
                primaryURL: request.context.primaryURL?.path,
                currentDirectoryURL: request.context.currentDirectoryURL?.path,
                resolvedTargetDirectory: request.context.resolvedTargetDirectory?.path,
                resolvedPrimaryTarget: request.context.resolvedPrimaryTarget?.path,
                resolvedSelectionDirectory: request.context.resolvedSelectionDirectory?.path,
                selectionKind: request.context.selectionKind.rawValue,
                detectedTools: Dictionary(
                    uniqueKeysWithValues: request.context.detectedTools.map { kind, availability in
                        (kind.rawValue, ToolAvailabilityWire(
                            kind: availability.kind.rawValue,
                            isInstalled: availability.isInstalled,
                            executablePath: availability.executablePath,
                            appPath: availability.appPath
                        ))
                    }
                ),
                fileMetadata: request.context.fileMetadata.map {
                    FileMetadataWire(
                        url: $0.url.path,
                        isDirectory: $0.isDirectory,
                        fileSize: $0.fileSize,
                        uti: $0.uti,
                        fileExtension: $0.fileExtension,
                        isScriptLike: $0.isScriptLike
                    )
                },
                extensionWindowTitle: request.context.extensionWindowTitle,
                capabilities: request.context.capabilities.map {
                    .init(
                        hasWorkingDirectory: $0.hasWorkingDirectory,
                        hasWritableTarget: $0.hasWritableTarget,
                        scriptNames: $0.scriptNames
                    )
                }
            ),
            createdAt: formatter.string(from: request.createdAt)
        )
    }

    public static func decode(_ wire: ActionRequestWire) throws -> ActionRequest {
        let formatter = makeFormatter()
        guard let id = UUID(uuidString: wire.id) else {
            throw WireDecodeError.invalidUUID(wire.id)
        }
        guard let createdAt = formatter.date(from: wire.createdAt) else {
            throw WireDecodeError.invalidDate(wire.createdAt)
        }
        guard let selectionKind = SelectionKind(rawValue: wire.context.selectionKind) else {
            throw WireDecodeError.invalidSelectionKind(wire.context.selectionKind)
        }
        let detectedTools = try Dictionary(
            uniqueKeysWithValues: wire.context.detectedTools.map { key, availability in
                guard let kind = ToolKind(rawValue: key), let availabilityKind = ToolKind(rawValue: availability.kind), kind == availabilityKind else {
                    throw WireDecodeError.invalidToolKind(key)
                }
                return (
                    kind,
                    ToolAvailability(
                        kind: availabilityKind,
                        isInstalled: availability.isInstalled,
                        executablePath: availability.executablePath,
                        appPath: availability.appPath
                    )
                )
            }
        )
        let fileMetadata = wire.context.fileMetadata.map {
            FileMetadata(
                url: URL(fileURLWithPath: $0.url),
                isDirectory: $0.isDirectory,
                fileSize: $0.fileSize,
                uti: $0.uti,
                fileExtension: $0.fileExtension,
                isScriptLike: $0.isScriptLike
            )
        }

        return ActionRequest(
            id: id,
            actionID: wire.actionID,
            context: FinderActionContext(
                selectedURLs: wire.context.selectedURLs.map { URL(fileURLWithPath: $0) },
                primaryURL: wire.context.primaryURL.map { URL(fileURLWithPath: $0) },
                currentDirectoryURL: wire.context.currentDirectoryURL.map { URL(fileURLWithPath: $0) },
                resolvedTargetDirectory: wire.context.resolvedTargetDirectory.map { URL(fileURLWithPath: $0) },
                resolvedPrimaryTarget: wire.context.resolvedPrimaryTarget.map { URL(fileURLWithPath: $0) },
                resolvedSelectionDirectory: wire.context.resolvedSelectionDirectory.map { URL(fileURLWithPath: $0) },
                selectionKind: selectionKind,
                detectedTools: detectedTools,
                fileMetadata: fileMetadata,
                extensionWindowTitle: wire.context.extensionWindowTitle,
                capabilities: wire.context.capabilities.map {
                    .init(
                        hasWorkingDirectory: $0.hasWorkingDirectory,
                        hasWritableTarget: $0.hasWritableTarget,
                        scriptNames: $0.scriptNames
                    )
                }
            ),
            createdAt: createdAt
        )
    }

    public enum WireDecodeError: LocalizedError {
        case invalidUUID(String)
        case invalidDate(String)
        case invalidSelectionKind(String)
        case invalidToolKind(String)

        public var errorDescription: String? {
            switch self {
            case let .invalidUUID(value):
                return "Invalid ActionRequestWire.id UUID: \(value)"
            case let .invalidDate(value):
                return "Invalid ActionRequestWire.createdAt: \(value)"
            case let .invalidSelectionKind(value):
                return "Invalid FinderActionContextWire.selectionKind: \(value)"
            case let .invalidToolKind(value):
                return "Invalid FinderActionContextWire.detectedTools key: \(value)"
            }
        }
    }
}
