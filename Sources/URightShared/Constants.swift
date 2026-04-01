import Foundation

public enum URightConstants {
    public static let appName = "U-Right"
    public static let appBundleIdentifier = "com.openai.uright"
    public static let extensionBundleIdentifier = "com.openai.uright.findersync"
    public static let appGroupIdentifier = "group.com.openai.uright"
    public static let handoffNotification = Notification.Name("com.openai.uright.action-request")
    public static let extensionWakeNotification = Notification.Name("com.openai.uright.extension-status")
    public static let logFileName = "uright.log"
    public static let settingsFileName = "settings.json"
    public static let settingsBackupFileName = "settings.backup.json"
    public static let requestDirectoryName = "Requests"
    public static let templateDirectoryName = "Templates"
    public static let scriptsDirectoryName = "Scripts"
}
