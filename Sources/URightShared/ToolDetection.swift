import AppKit
import Foundation

public final class ToolDetector: @unchecked Sendable {
    public static let shared = ToolDetector()

    private let fileManager = FileManager.default
    private let workspace = NSWorkspace.shared

    public func detect(settings: AppSettings = SettingsStore.shared.load()) -> [ToolKind: ToolAvailability] {
        var results: [ToolKind: ToolAvailability] = [:]
        for kind in ToolKind.allCases {
            let customPath = settings.customExecutablePaths[kind.rawValue]
            let executablePath = customPath?.isEmpty == false ? customPath : executablePath(for: kind)
            let appPath = applicationPath(for: kind)
            let installed = executablePath != nil || appPath != nil
            results[kind] = ToolAvailability(kind: kind, isInstalled: installed, executablePath: executablePath, appPath: appPath)
        }
        return results
    }

    private func executablePath(for kind: ToolKind) -> String? {
        let names: [String] = switch kind {
        case .terminal: ["open"]
        case .ghostty: ["ghostty"]
        case .iTerm: ["iterm2"]
        case .vscode: ["code"]
        case .cursor: ["cursor"]
        case .zed: ["zed"]
        case .claude: ["claude"]
        case .codex: ["codex"]
        case .gh: ["gh"]
        case .lazygit: ["lazygit"]
        case .gitup: ["gitup"]
        }
        for name in names {
            if let path = lookupBinary(named: name) {
                return path
            }
        }
        return nil
    }

    private func applicationPath(for kind: ToolKind) -> String? {
        let appNames: [String] = switch kind {
        case .terminal: ["Terminal.app"]
        case .ghostty: ["Ghostty.app"]
        case .iTerm: ["iTerm.app", "iTerm2.app"]
        case .vscode: ["Visual Studio Code.app"]
        case .cursor: ["Cursor.app"]
        case .zed: ["Zed.app"]
        case .claude: ["Claude.app"]
        case .codex: ["Codex.app"]
        case .gh, .lazygit, .gitup: ["GitUp.app"]
        }
        let searchRoots = [
            URL(fileURLWithPath: "/Applications", isDirectory: true),
            fileManager.homeDirectoryForCurrentUser.appendingPathComponent("Applications", isDirectory: true)
        ]
        for appName in appNames {
            for root in searchRoots {
                let candidate = root.appendingPathComponent(appName)
                if fileManager.fileExists(atPath: candidate.path) {
                    return candidate.path
                }
            }
            if let found = workspace.urlForApplication(withBundleIdentifier: bundleIdentifier(forAppName: appName)) {
                return found.path
            }
        }
        return nil
    }

    private func bundleIdentifier(forAppName appName: String) -> String {
        switch appName {
        case "Ghostty.app": return "com.mitchellh.ghostty"
        case "iTerm.app", "iTerm2.app": return "com.googlecode.iterm2"
        case "Visual Studio Code.app": return "com.microsoft.VSCode"
        case "Cursor.app": return "com.todesktop.230313mzl4w4u92"
        case "Zed.app": return "dev.zed.Zed"
        case "Claude.app": return "com.anthropic.claudedesktop"
        case "Codex.app": return "com.openai.codex"
        default: return "com.apple.Terminal"
        }
    }

    private func lookupBinary(named name: String) -> String? {
        let paths = (ProcessInfo.processInfo.environment["PATH"] ?? "").split(separator: ":").map(String.init)
        for directory in paths {
            let candidate = URL(fileURLWithPath: directory).appendingPathComponent(name)
            if fileManager.isExecutableFile(atPath: candidate.path) {
                return candidate.path
            }
        }
        let common = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"]
        for directory in common {
            let candidate = URL(fileURLWithPath: directory).appendingPathComponent(name)
            if fileManager.isExecutableFile(atPath: candidate.path) {
                return candidate.path
            }
        }
        return nil
    }
}
