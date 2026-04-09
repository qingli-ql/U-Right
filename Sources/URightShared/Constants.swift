import Foundation

public enum URightConstants {
    public static let appName = "U-Right"
    public static let appBundleIdentifier = "com.openai.uright"
    public static let extensionBundleIdentifier = "com.openai.uright.findersync"
    public static let appGroupInfoKey = "URightAppGroupIdentifier"
    public static let appGroupEnvironmentKey = "APP_GROUP_IDENTIFIER"
    public static let legacyAppGroupIdentifier = "group.com.openai.uright"
    public static let handoffNotification = Notification.Name("com.openai.uright.action-request")
    public static let extensionWakeNotification = Notification.Name("com.openai.uright.extension-status")
    public static let logFileName = "uright.log"
    public static let devHostStateFileName = "dev-host-state.json"
    public static let preferredHostRuntimeFileName = "preferred-host-runtime.json"
    public static let finderMenuSnapshotFileName = "finder-menu-snapshot.json"
    public static let settingsFileName = "settings.json"
    public static let settingsBackupFileName = "settings.backup.json"
    public static let requestDirectoryName = "Requests"
    public static let requestIncomingDirectoryName = "incoming"
    public static let requestProcessingDirectoryName = "processing"
    public static let requestDoneDirectoryName = "done"
    public static let requestFailedDirectoryName = "failed"
    public static let templateDirectoryName = "Templates"
    public static let scriptsDirectoryName = "Scripts"

    public static var appGroupIdentifier: String {
        resolvedAppGroupIdentifier()
    }

    public static func resolvedAppGroupIdentifier(bundle: Bundle = .main) -> String {
        if let value = bundle.object(forInfoDictionaryKey: appGroupInfoKey) as? String {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty, !trimmed.contains("$(") {
                return validatedAppGroupIdentifier(trimmed)
            }
        }
        if let value = ProcessInfo.processInfo.environment[appGroupInfoKey] {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return validatedAppGroupIdentifier(trimmed)
            }
        }
        if let value = ProcessInfo.processInfo.environment[appGroupEnvironmentKey] {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return validatedAppGroupIdentifier(trimmed)
            }
        }
        fatalError(
            "Missing app group identifier. Provide \(appGroupInfoKey) in Info.plist or set \(appGroupEnvironmentKey) explicitly."
        )
    }

    private static func validatedAppGroupIdentifier(_ value: String) -> String {
        if value == legacyAppGroupIdentifier {
            fatalError("Legacy app group \(legacyAppGroupIdentifier) is no longer supported on the default path.")
        }
        return value
    }
}
