import AppKit
import CryptoKit
import Foundation
import UniformTypeIdentifiers

public enum FileSystemHelper {
    public static func metadata(for url: URL) -> FileMetadata {
        let values = try? url.resourceValues(forKeys: [.isDirectoryKey, .fileSizeKey, .contentTypeKey])
        let isDirectory = values?.isDirectory ?? false
        let fileExtension = url.pathExtension.lowercased()
        let isScriptLike = ["sh", "bash", "zsh", "py", "rb", "js", "ts", "command"].contains(fileExtension)
        return FileMetadata(
            url: url,
            isDirectory: isDirectory,
            fileSize: Int64(values?.fileSize ?? 0),
            uti: values?.contentType?.identifier,
            fileExtension: fileExtension,
            isScriptLike: isScriptLike
        )
    }

    public static func selectionKind(for urls: [URL], fallbackDirectory: URL?) -> SelectionKind {
        if urls.isEmpty { return .empty }
        if urls.count > 1 { return .multi }
        let metadata = metadata(for: urls[0])
        if metadata.isDirectory { return .folder }
        if fallbackDirectory != nil { return .file }
        return .file
    }

    public static func relativePath(from base: URL?, to target: URL) -> String {
        guard let base else { return target.path }
        let baseComponents = base.standardized.pathComponents
        let targetComponents = target.standardized.pathComponents
        let sharedCount = zip(baseComponents, targetComponents).prefix { $0 == $1 }.count
        let climb = Array(repeating: "..", count: max(baseComponents.count - sharedCount, 0))
        let descend = Array(targetComponents.dropFirst(sharedCount))
        let parts = climb + descend
        return parts.isEmpty ? "." : NSString.path(withComponents: parts)
    }

    public static func sanitizedFileName(_ name: String) -> String {
        let invalid = CharacterSet(charactersIn: "/:\0")
        return name.components(separatedBy: invalid).joined(separator: "-").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func sha256(of data: Data) -> String {
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    public static func md5(of data: Data) -> String {
        let digest = Insecure.MD5.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

public enum SharedPaths {
    public static func appGroupContainerURL() -> URL {
        if let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: URightConstants.appGroupIdentifier) {
            return url
        }
        let fallback = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/\(URightConstants.appName)", isDirectory: true)
        try? FileManager.default.createDirectory(at: fallback, withIntermediateDirectories: true)
        return fallback
    }

    public static func requestsDirectory() -> URL {
        let directory = appGroupContainerURL().appendingPathComponent(URightConstants.requestDirectoryName, isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    public static func logFileURL() -> URL {
        appGroupContainerURL().appendingPathComponent(URightConstants.logFileName)
    }

    public static func builtInTemplatesDirectory() -> URL {
        let directory = appGroupContainerURL().appendingPathComponent(URightConstants.templateDirectoryName, isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    public static func scriptsDirectory() -> URL {
        let directory = appGroupContainerURL().appendingPathComponent(URightConstants.scriptsDirectoryName, isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }
}
