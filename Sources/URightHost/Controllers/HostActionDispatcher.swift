import AppKit
import Foundation
import URightShared

@MainActor
final class HostActionDispatcher {
    private let tools = ExternalToolService()
    private let templates = TemplateService()
    private let ai = AIService()

    func perform(request: ActionRequest) {
        DispatchQueue.main.async {
            do {
                try self.performAction(id: request.actionID, context: request.context)
            } catch {
                Logger.shared.error("dispatcher", error.localizedDescription)
                PromptPanelController.showError(error.localizedDescription)
            }
        }
    }

    private func performAction(id: String, context: FinderActionContext) throws {
        Logger.shared.info("dispatcher", "Performing \(id)")
        switch id {
        case ActionIDs.newFile:
            try createTemplate(id: "empty", context: context)
        case ActionIDs.newFolder:
            _ = try templates.createFolder(in: try targetDirectory(for: context))
        case ActionIDs.openTerminal:
            try tools.open(urls: [], using: .terminal, context: context)
        case ActionIDs.openGhostty:
            try tools.open(urls: [], using: .ghostty, context: context)
        case ActionIDs.openITerm:
            try tools.open(urls: [], using: .iTerm, context: context)
        case ActionIDs.openVSCode, ActionIDs.editVSCode, ActionIDs.openAllVSCode:
            try tools.open(urls: actionTargets(for: context), using: .vscode, context: context)
        case ActionIDs.openCursor, ActionIDs.editCursor, ActionIDs.openAllCursor:
            try tools.open(urls: actionTargets(for: context), using: .cursor, context: context)
        case ActionIDs.openZed, ActionIDs.editZed:
            try tools.open(urls: actionTargets(for: context), using: .zed, context: context)
        case ActionIDs.copyPath:
            copyToClipboard(actionTargets(for: context).map(\.path).joined(separator: "\n"))
        case ActionIDs.copyRelativePath:
            copyToClipboard(actionTargets(for: context).map { FileSystemHelper.relativePath(from: context.currentDirectoryURL, to: $0) }.joined(separator: "\n"))
        case ActionIDs.copyFilename:
            copyToClipboard(context.primaryURL?.lastPathComponent ?? "")
        case ActionIDs.copyBasename:
            copyToClipboard(context.primaryURL?.deletingPathExtension().lastPathComponent ?? "")
        case ActionIDs.copyExtension:
            copyToClipboard(context.primaryURL?.pathExtension ?? "")
        case ActionIDs.copyAllPaths:
            copyToClipboard(context.selectedURLs.map(\.path).joined(separator: "\n"))
        case ActionIDs.revealInFinder, ActionIDs.openContainingFolder:
            NSWorkspace.shared.activateFileViewerSelecting(actionTargets(for: context))
        case ActionIDs.getInfo:
            NSWorkspace.shared.activateFileViewerSelecting(actionTargets(for: context))
        case ActionIDs.quickLook, ActionIDs.markdownPreview, ActionIDs.openDefault:
            if let target = actionTargets(for: context).first {
                NSWorkspace.shared.open(target)
            }
        case ActionIDs.duplicate:
            try duplicate(context: context)
        case ActionIDs.rename:
            try rename(context: context)
        case ActionIDs.trash, ActionIDs.moveAllToTrash:
            try trash(context: context)
        case ActionIDs.compress, ActionIDs.compressSelected:
            try compress(context: context)
        case ActionIDs.openTerminalHere:
            if let parent = context.primaryURL?.deletingLastPathComponent() {
                try tools.open(urls: [parent], using: .terminal, context: context)
            }
        case ActionIDs.lineEndingLF:
            try rewriteLineEndings(context: context, ending: "\n")
        case ActionIDs.lineEndingCRLF:
            try rewriteLineEndings(context: context, ending: "\r\n")
        case ActionIDs.jsonFormat:
            try formatJSON(context: context)
        case ActionIDs.toggleExecutable:
            try toggleExecutable(context: context)
        case ActionIDs.sha256:
            try hash(context: context, type: .sha256)
        case ActionIDs.md5:
            try hash(context: context, type: .md5)
        case ActionIDs.countItems:
            try countItems(context: context)
        case ActionIDs.folderSize:
            try folderSize(context: context)
        case ActionIDs.gitStatus:
            try runGitStatus(context: context)
        case ActionIDs.gitGUI:
            try openGitGUI(context: context)
        case ActionIDs.searchInFolder:
            try tools.open(urls: [try targetDirectory(for: context)], using: SettingsStore.shared.load().defaultEditor, context: context)
        case ActionIDs.refresh:
            try Process.runSync(URL(fileURLWithPath: "/usr/bin/killall"), arguments: ["Finder"])
        case ActionIDs.aiAskClaude, ActionIDs.aiAskCodex, ActionIDs.aiExplainProject, ActionIDs.aiSummarizeFiles, ActionIDs.aiGenerateReadme, ActionIDs.aiGenerateGitignore, ActionIDs.aiReviewCode, ActionIDs.aiRefactorFile, ActionIDs.aiWriteTests, ActionIDs.aiExplainError, ActionIDs.aiJSONSchema, ActionIDs.aiCommitMessage, ActionIDs.aiPRSummary, ActionIDs.aiSummarizeSelection, ActionIDs.aiAskSelection:
            ai.runAIAction(actionID: id, context: context)
        case ActionIDs.repeatLastAIAction:
            let last = SettingsStore.shared.load().lastAIActionID ?? ActionIDs.aiAskCodex
            ai.runAIAction(actionID: last, context: context)
        default:
            if id.hasPrefix(ActionIDs.newFromTemplatePrefix) {
                try createTemplate(id: String(id.dropFirst(ActionIDs.newFromTemplatePrefix.count)), context: context)
            } else if id.hasPrefix("folder.new-") {
                let alias = String(id.dropFirst("folder.new-".count))
                try createTemplate(id: mappedTemplateID(alias), context: context)
            } else if id.hasPrefix("open-with.") {
                try openWith(id: String(id.dropFirst("open-with.".count)), context: context)
            } else if id.hasPrefix("script.run.") {
                try runScript(named: String(id.dropFirst("script.run.".count)), context: context)
            } else {
                PromptPanelController.showInfo(title: "Not Yet Implemented", message: id)
            }
        }
    }

    private func actionTargets(for context: FinderActionContext) -> [URL] {
        if context.selectedURLs.isEmpty, let working = context.workingDirectoryURL { return [working] }
        return context.selectedURLs.isEmpty ? [context.primaryURL].compactMap { $0 } : context.selectedURLs
    }

    private func targetDirectory(for context: FinderActionContext) throws -> URL {
        if context.selectionKind == .folder { return context.primaryURL! }
        if let directory = context.currentDirectoryURL ?? context.workingDirectoryURL { return directory }
        throw HostCommandError.invalidContext("未找到目录上下文")
    }

    private func createTemplate(id: String, context: FinderActionContext) throws {
        let directory = try targetDirectory(for: context)
        guard let template = templates.availableTemplates().first(where: { $0.id == id }) else {
            throw HostCommandError.invalidContext("模板不存在：\(id)")
        }
        if let url = try templates.createFile(using: template, in: directory, promptTitle: template.title) {
            NSWorkspace.shared.activateFileViewerSelecting([url])
        }
    }

    private func copyToClipboard(_ string: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(string, forType: .string)
    }

    private func duplicate(context: FinderActionContext) throws {
        for url in actionTargets(for: context) {
            let copyURL = url.deletingLastPathComponent().appendingPathComponent(url.deletingPathExtension().lastPathComponent + " copy" + (url.pathExtension.isEmpty ? "" : ".\(url.pathExtension)"))
            try FileManager.default.copyItem(at: url, to: copyURL)
        }
    }

    private func rename(context: FinderActionContext) throws {
        guard let url = context.primaryURL else { return }
        guard let name = PromptPanelController.promptForText(title: "Rename", message: "输入新名称", defaultValue: url.lastPathComponent) else { return }
        let destination = url.deletingLastPathComponent().appendingPathComponent(name)
        try FileManager.default.moveItem(at: url, to: destination)
    }

    private func trash(context: FinderActionContext) throws {
        guard PromptPanelController.confirm(title: "Move to Trash", message: "此操作需要二次确认。") else { return }
        for url in actionTargets(for: context) {
            var resultingItemURL: NSURL?
            try FileManager.default.trashItem(at: url, resultingItemURL: &resultingItemURL)
        }
    }

    private func compress(context: FinderActionContext) throws {
        let targets = actionTargets(for: context)
        guard let first = targets.first else { return }
        let archiveName = PromptPanelController.promptForText(title: "Compress", message: "Archive name", defaultValue: first.deletingPathExtension().lastPathComponent + ".zip") ?? "Archive.zip"
        let cwd = first.deletingLastPathComponent()
        let args = ["-r", archiveName] + targets.map(\.lastPathComponent)
        try Process.runSync(URL(fileURLWithPath: "/usr/bin/zip"), arguments: args, currentDirectoryURL: cwd)
    }

    private func rewriteLineEndings(context: FinderActionContext, ending: String) throws {
        guard let url = context.primaryURL else { return }
        guard PromptPanelController.confirm(title: "Rewrite File", message: "将重写文件内容。继续吗？") else { return }
        let content = try String(contentsOf: url, encoding: .utf8)
        let normalized = content.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n").components(separatedBy: "\n").joined(separator: ending)
        try normalized.write(to: url, atomically: true, encoding: .utf8)
    }

    private func formatJSON(context: FinderActionContext) throws {
        guard let url = context.primaryURL else { return }
        let data = try Data(contentsOf: url)
        let object = try JSONSerialization.jsonObject(with: data)
        let formatted = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
        try formatted.write(to: url, options: .atomic)
    }

    private func toggleExecutable(context: FinderActionContext) throws {
        guard let url = context.primaryURL else { return }
        let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
        let current = (attributes[.posixPermissions] as? NSNumber)?.intValue ?? 0o644
        let next = (current & 0o111) == 0 ? current | 0o755 : current & ~0o111
        try FileManager.default.setAttributes([.posixPermissions: next], ofItemAtPath: url.path)
    }

    private enum HashKind { case sha256, md5 }

    private func hash(context: FinderActionContext, type: HashKind) throws {
        guard let url = context.primaryURL else { return }
        let data = try Data(contentsOf: url)
        let value = type == .sha256 ? FileSystemHelper.sha256(of: data) : FileSystemHelper.md5(of: data)
        copyToClipboard(value)
        PromptPanelController.showInfo(title: type == .sha256 ? "SHA256" : "MD5", message: value)
    }

    private func countItems(context: FinderActionContext) throws {
        let directory = try targetDirectory(for: context)
        let count = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil).count) ?? 0
        PromptPanelController.showInfo(title: "Count Items", message: "\(count) items")
    }

    private func folderSize(context: FinderActionContext) throws {
        let directory = try targetDirectory(for: context)
        let enumerator = FileManager.default.enumerator(at: directory, includingPropertiesForKeys: [.fileSizeKey])
        var total: Int64 = 0
        while let url = enumerator?.nextObject() as? URL {
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            total += Int64(size)
        }
        PromptPanelController.showInfo(title: "Folder Size", message: ByteCountFormatter.string(fromByteCount: total, countStyle: .file))
    }

    private func runGitStatus(context: FinderActionContext) throws {
        let directory = try targetDirectory(for: context)
        let process = Process()
        let out = Pipe()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["git", "status", "--short", "--branch"]
        process.currentDirectoryURL = directory
        process.standardOutput = out
        try process.run()
        process.waitUntilExit()
        let data = try out.fileHandleForReading.readToEnd() ?? Data()
        let output = String(data: data, encoding: .utf8) ?? ""
        PromptPanelController.showInfo(title: "Git Status", message: output.isEmpty ? "No output" : output)
    }

    private func openGitGUI(context: FinderActionContext) throws {
        if context.detectedTools[.lazygit]?.isInstalled == true, let cli = context.detectedTools[.lazygit]?.executablePath {
            try Process.runSync(URL(fileURLWithPath: cli), arguments: [], currentDirectoryURL: try targetDirectory(for: context))
        } else if context.detectedTools[.gitup]?.isInstalled == true {
            try tools.open(urls: [try targetDirectory(for: context)], using: .terminal, context: context)
        } else {
            PromptPanelController.showInfo(title: "Git GUI", message: "未检测到 lazygit / GitUp。")
        }
    }

    private func mappedTemplateID(_ alias: String) -> String {
        switch alias {
        case "text": return "text"
        case "markdown": return "markdown"
        case "json": return "json"
        case "python": return "python"
        case "shell": return "shell"
        case "gitignore": return "gitignore"
        case "readme": return "readme"
        default: return alias
        }
    }

    private func openWith(id: String, context: FinderActionContext) throws {
        switch id {
        case "terminal": try tools.open(urls: actionTargets(for: context), using: .terminal, context: context)
        case "ghostty": try tools.open(urls: actionTargets(for: context), using: .ghostty, context: context)
        case "iTerm": try tools.open(urls: actionTargets(for: context), using: .iTerm, context: context)
        case "vscode": try tools.open(urls: actionTargets(for: context), using: .vscode, context: context)
        case "cursor": try tools.open(urls: actionTargets(for: context), using: .cursor, context: context)
        case "zed": try tools.open(urls: actionTargets(for: context), using: .zed, context: context)
        default: break
        }
    }

    private func runScript(named name: String, context: FinderActionContext) throws {
        let url = SharedPaths.scriptsDirectory().appendingPathComponent(name)
        try tools.runScript(at: url, in: context.workingDirectoryURL)
    }
}

private extension Process {
    @discardableResult
    static func runSync(_ executableURL: URL, arguments: [String], currentDirectoryURL: URL? = nil) throws -> Process {
        let process = Process()
        process.executableURL = executableURL
        process.arguments = arguments
        process.currentDirectoryURL = currentDirectoryURL
        try process.run()
        process.waitUntilExit()
        return process
    }
}
