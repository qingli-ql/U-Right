import AppKit
import Foundation
import URightShared

final class ExternalToolService {
    func open(urls: [URL], using tool: ToolKind, context: FinderActionContext) throws {
        let targetURLs = urls.isEmpty ? [context.workingDirectoryURL].compactMap { $0 } : urls
        guard !targetURLs.isEmpty else {
            throw HostCommandError.invalidContext("没有可打开的目标")
        }

        let tools = context.detectedTools
        switch tool {
        case .terminal:
            try openWithApplication(named: "Terminal", urls: [targetURLs.first!])
        case .ghostty:
            if let cli = tools[.ghostty]?.executablePath {
                try runDetached(executable: cli, arguments: [targetURLs.first!.path])
            } else {
                try openWithApplication(named: "Ghostty", urls: [targetURLs.first!])
            }
        case .iTerm:
            try openWithApplication(named: "iTerm", urls: [targetURLs.first!])
        case .vscode:
            try openEditor(tool: .vscode, urls: targetURLs, tools: tools)
        case .cursor:
            try openEditor(tool: .cursor, urls: targetURLs, tools: tools)
        case .zed:
            try openEditor(tool: .zed, urls: targetURLs, tools: tools)
        default:
            throw HostCommandError.toolUnavailable(tool.rawValue)
        }
    }

    func runScript(at url: URL, in workingDirectory: URL?) throws {
        try runDetached(executable: "/bin/zsh", arguments: [url.path], currentDirectory: workingDirectory)
    }

    private func openEditor(tool: ToolKind, urls: [URL], tools: [ToolKind: ToolAvailability]) throws {
        if let cli = tools[tool]?.executablePath {
            try runDetached(executable: cli, arguments: urls.map(\.path))
            return
        }
        let appName: String = switch tool {
        case .vscode: "Visual Studio Code"
        case .cursor: "Cursor"
        case .zed: "Zed"
        default: "Terminal"
        }
        try openWithApplication(named: appName, urls: urls)
    }

    private func openWithApplication(named appName: String, urls: [URL]) throws {
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        NSWorkspace.shared.open(urls, withApplicationAt: NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleID(for: appName)) ?? URL(fileURLWithPath: "/Applications/\(appName).app"), configuration: configuration)
    }

    private func bundleID(for appName: String) -> String {
        switch appName {
        case "Visual Studio Code": return "com.microsoft.VSCode"
        case "Cursor": return "com.todesktop.230313mzl4w4u92"
        case "Zed": return "dev.zed.Zed"
        case "Ghostty": return "com.mitchellh.ghostty"
        case "iTerm": return "com.googlecode.iterm2"
        default: return "com.apple.Terminal"
        }
    }

    private func runDetached(executable: String, arguments: [String], currentDirectory: URL? = nil) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments
        process.currentDirectoryURL = currentDirectory
        try process.run()
    }
}
