import AppKit
import CryptoKit
import Darwin
import Foundation
import UniformTypeIdentifiers

enum DiagnosticLogger {
    static func emit(_ message: String) {
        let line = "[URight] \(message)\n"
        if let data = line.data(using: .utf8) {
            FileHandle.standardError.write(data)
        }
        NSLog("%@", message)
    }
}

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
    public enum PreferredHostRuntime: String {
        case nativeApp = "native-app"
        case electronDev = "electron-dev"
        case electronApp = "electron-app"
    }

    private static func createDirectory(at url: URL, purpose: String) {
        do {
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        } catch {
            DiagnosticLogger.emit("Failed to create \(purpose) directory at \(url.path) appGroup=\(URightConstants.appGroupIdentifier) error=\(error.localizedDescription)")
        }
    }

    public static func appGroupContainerURL() -> URL {
        let appGroupIdentifier = URightConstants.appGroupIdentifier
        if let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) {
            return url
        }
        fatalError(
            "App group container is unavailable for \(appGroupIdentifier). Ensure Host and Finder Extension are signed with the same app group."
        )
    }

    public static func requestsDirectory() -> URL {
        let directory = appGroupContainerURL().appendingPathComponent(URightConstants.requestDirectoryName, isDirectory: true)
        createDirectory(at: directory, purpose: "requests")
        return directory
    }

    public static func incomingRequestsDirectory() -> URL {
        let directory = requestsDirectory().appendingPathComponent(URightConstants.requestIncomingDirectoryName, isDirectory: true)
        createDirectory(at: directory, purpose: "incoming requests")
        return directory
    }

    public static func processingRequestsDirectory() -> URL {
        let directory = requestsDirectory().appendingPathComponent(URightConstants.requestProcessingDirectoryName, isDirectory: true)
        createDirectory(at: directory, purpose: "processing requests")
        return directory
    }

    public static func completedRequestsDirectory() -> URL {
        let directory = requestsDirectory().appendingPathComponent(URightConstants.requestDoneDirectoryName, isDirectory: true)
        createDirectory(at: directory, purpose: "completed requests")
        return directory
    }

    public static func failedRequestsDirectory() -> URL {
        let directory = requestsDirectory().appendingPathComponent(URightConstants.requestFailedDirectoryName, isDirectory: true)
        createDirectory(at: directory, purpose: "failed requests")
        return directory
    }

    public static func logFileURL() -> URL {
        appGroupContainerURL().appendingPathComponent(URightConstants.logFileName)
    }

    public static func devHostStateFileURL() -> URL {
        appGroupContainerURL().appendingPathComponent(URightConstants.devHostStateFileName)
    }

    public static func preferredHostRuntimeFileURL() -> URL {
        appGroupContainerURL().appendingPathComponent(URightConstants.preferredHostRuntimeFileName)
    }

    public static func finderMenuSnapshotFileURL() -> URL {
        appGroupContainerURL().appendingPathComponent(URightConstants.finderMenuSnapshotFileName)
    }

    public static func builtInTemplatesDirectory() -> URL {
        let directory = appGroupContainerURL().appendingPathComponent(URightConstants.templateDirectoryName, isDirectory: true)
        createDirectory(at: directory, purpose: "templates")
        return directory
    }

    public static func scriptsDirectory() -> URL {
        let directory = appGroupContainerURL().appendingPathComponent(URightConstants.scriptsDirectoryName, isDirectory: true)
        createDirectory(at: directory, purpose: "scripts")
        return directory
    }

    public static func hasActiveDevHost() -> Bool {
        let url = devHostStateFileURL()
        guard
            let data = try? Data(contentsOf: url),
            let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let pid = payload["pid"] as? Int
        else {
            return false
        }

        if kill(pid_t(pid), 0) == 0 || errno == EPERM {
            return true
        }

        try? FileManager.default.removeItem(at: url)
        DiagnosticLogger.emit("Removed stale dev host marker at \(url.path) pid=\(pid)")
        return false
    }

    public static func preferredHostRuntime() -> PreferredHostRuntime? {
        let url = preferredHostRuntimeFileURL()
        guard
            let data = try? Data(contentsOf: url),
            let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let rawValue = payload["runtime"] as? String
        else {
            return nil
        }
        return PreferredHostRuntime(rawValue: rawValue)
    }

    public static func writePreferredHostRuntime(_ runtime: PreferredHostRuntime) {
        let url = preferredHostRuntimeFileURL()
        let payload: [String: Any] = [
            "runtime": runtime.rawValue,
            "updatedAt": ISO8601DateFormatter().string(from: Date())
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted]) else {
            DiagnosticLogger.emit("Failed to encode preferred host runtime payload runtime=\(runtime.rawValue)")
            return
        }
        do {
            try data.write(to: url, options: .atomic)
        } catch {
            DiagnosticLogger.emit("Failed to write preferred host runtime runtime=\(runtime.rawValue) path=\(url.path) error=\(error.localizedDescription)")
        }
    }
}

public enum HostWakePolicy {
    public enum Decision: String {
        case skipActiveDevHost = "skip-active-dev-host"
        case wakeInstalledHost = "wake-installed-host"
    }

    public static func decision(
        hasActiveDevHost: Bool = SharedPaths.hasActiveDevHost(),
        preferredRuntime: SharedPaths.PreferredHostRuntime? = SharedPaths.preferredHostRuntime()
    ) -> Decision {
        if hasActiveDevHost {
            return .skipActiveDevHost
        }
        _ = preferredRuntime
        return .wakeInstalledHost
    }
}
