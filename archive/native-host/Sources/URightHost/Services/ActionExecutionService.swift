import AppKit
import Foundation
import URightShared

enum ActionExecutionResult {
    case success(String?)
    case userCancelled
    case failure(String)
}

@MainActor
protocol ActionHandler {
    var actionIDs: [String] { get }
    func canPerform(actionID: String, context: FinderActionContext, settings: AppSettings) -> Bool
    func perform(actionID: String, context: FinderActionContext, settings: AppSettings) throws -> ActionExecutionResult
}

@MainActor
final class ConfirmationCoordinator {
    func confirmIfNeeded(actionID: String, definition: ActionDefinition?) -> Bool {
        guard let definition, definition.requirements.needsConfirmation else { return true }
        let title = definition.requirements.isDestructive ? "确认危险操作" : "确认操作"
        let message = definition.requirements.isDestructive
            ? "“\(definition.title)” 会修改或删除当前目标，是否继续？"
            : "“\(definition.title)” 将修改当前目标，是否继续？"
        return PromptPanelController.confirm(title: title, message: message)
    }
}

@MainActor
final class ActionHandlerRegistry {
    private let handlers: [ActionHandler]

    init(handlers: [ActionHandler]) {
        self.handlers = handlers
    }

    func handler(for actionID: String) -> ActionHandler? {
        handlers.first { $0.actionIDs.contains(actionID) || $0.actionIDs.contains(where: { actionID.hasPrefix($0) }) }
    }
}

@MainActor
final class ActionExecutionService {
    private let registry: ActionHandlerRegistry
    private let confirmation = ConfirmationCoordinator()

    init(
        templates: TemplateService = TemplateService(),
        tools: ExternalToolService = ExternalToolService(),
        ai: AIService = AIService()
    ) {
        self.registry = ActionHandlerRegistry(handlers: [
            CreateActionHandler(templates: templates),
            OpenToolActionHandler(tools: tools),
            ClipboardActionHandler(),
            FileOperationActionHandler(),
            GitActionHandler(),
            AIActionHandler(ai: ai),
            ScriptActionHandler(tools: tools)
        ])
    }

    func execute(request: ActionRequest, settings: AppSettings) -> ActionExecutionResult {
        Logger.shared.info(
            "dispatcher",
            "Begin requestID=\(request.id.uuidString) action=\(request.actionID) selectionKind=\(request.context.selectionKind.rawValue) selectedCount=\(request.context.selectedURLs.count) primary=\(request.context.primaryURL?.path ?? "-") currentDir=\(request.context.currentDirectoryURL?.path ?? "-")"
        )
        guard let definition = resolvedDefinition(for: request.actionID) else {
            Logger.shared.error("dispatcher", "Unknown action: \(request.actionID)")
            return .failure("未知动作：\(request.actionID)")
        }
        guard confirmation.confirmIfNeeded(actionID: request.actionID, definition: definition) else {
            Logger.shared.info("dispatcher", "Action cancelled before execution: \(request.actionID)")
            return .userCancelled
        }
        guard let handler = registry.handler(for: request.actionID), handler.canPerform(actionID: request.actionID, context: request.context, settings: settings) else {
            Logger.shared.error("dispatcher", "No handler available for \(request.actionID)")
            return .failure("当前动作暂不可用：\(definition.title)")
        }
        do {
            let result = try handler.perform(actionID: request.actionID, context: request.context, settings: settings)
            switch result {
            case .success(let message):
                Logger.shared.info("dispatcher", "Success requestID=\(request.id.uuidString) action=\(request.actionID) message=\(message ?? "-")")
            case .userCancelled:
                Logger.shared.info("dispatcher", "Cancelled requestID=\(request.id.uuidString) action=\(request.actionID)")
            case .failure(let errorMessage):
                Logger.shared.error("dispatcher", "Failure requestID=\(request.id.uuidString) action=\(request.actionID) error=\(errorMessage)")
            }
            return result
        } catch {
            Logger.shared.error("dispatcher", error.localizedDescription)
            return .failure(error.localizedDescription)
        }
    }

    private func resolvedDefinition(for actionID: String) -> ActionDefinition? {
        if actionID.hasPrefix(ActionIDs.newFromTemplatePrefix) {
            return ActionDefinition(
                id: actionID,
                title: actionID,
                systemImageName: "doc.badge.plus",
                defaultCategory: .create,
                supportedContexts: [.folder, .empty],
                requirements: .init(requiresWritableTarget: true, requiresDirectoryContext: true),
                defaultOrder: 1000
            )
        }
        if actionID.hasPrefix("script.run.") {
            return ActionDefinition(
                id: actionID,
                title: actionID,
                systemImageName: "terminal",
                defaultCategory: .scripts,
                supportedContexts: SelectionKind.allCases,
                defaultOrder: 2000
            )
        }
        return ActionCatalog.definition(for: actionID)
    }
}

private protocol ActionContextResolving {}

extension ActionContextResolving {
    func actionTargets(for context: FinderActionContext) -> [URL] {
        if context.selectedURLs.isEmpty, let working = context.workingDirectoryURL { return [working] }
        return context.selectedURLs.isEmpty ? [context.primaryURL].compactMap { $0 } : context.selectedURLs
    }

    func targetDirectory(for context: FinderActionContext) throws -> URL {
        if context.selectionKind == .folder, let primary = context.primaryURL { return primary }
        if let directory = context.currentDirectoryURL ?? context.workingDirectoryURL { return directory }
        throw HostCommandError.invalidContext("未找到目录上下文")
    }
}

@MainActor
final class CreateActionHandler: ActionHandler, ActionContextResolving {
    private let templates: TemplateService

    init(templates: TemplateService) {
        self.templates = templates
    }

    var actionIDs: [String] { [ActionIDs.newFile, ActionIDs.newFolder, ActionIDs.newFromTemplatePrefix] }

    func canPerform(actionID: String, context: FinderActionContext, settings: AppSettings) -> Bool {
        [.folder, .empty].contains(context.selectionKind)
    }

    func perform(actionID: String, context: FinderActionContext, settings: AppSettings) throws -> ActionExecutionResult {
        let directory = try targetDirectory(for: context)
        if actionID == ActionIDs.newFolder {
            if let url = try templates.createFolder(in: directory) {
                NSWorkspace.shared.activateFileViewerSelecting([url])
                return .success("已创建文件夹：\(url.lastPathComponent)")
            }
            return .userCancelled
        }

        let templateID = actionID == ActionIDs.newFile ? "empty" : String(actionID.dropFirst(ActionIDs.newFromTemplatePrefix.count))
        guard let template = templates.availableTemplates().first(where: { $0.id == templateID }) else {
            throw HostCommandError.invalidContext("模板不存在：\(templateID)")
        }
        if let url = try templates.createFile(using: template, in: directory, promptTitle: template.title) {
            NSWorkspace.shared.activateFileViewerSelecting([url])
            return .success("已创建文件：\(url.lastPathComponent)")
        }
        return .userCancelled
    }
}

final class OpenToolActionHandler: ActionHandler, ActionContextResolving {
    private let tools: ExternalToolService

    init(tools: ExternalToolService) {
        self.tools = tools
    }

    var actionIDs: [String] { [ActionIDs.openTerminal, ActionIDs.openVSCode, ActionIDs.openCursor, ActionIDs.openZed, ActionIDs.revealInFinder, "open.custom."] }

    func canPerform(actionID: String, context: FinderActionContext, settings: AppSettings) -> Bool {
        actionID.hasPrefix("open.custom.") || true
    }

    func perform(actionID: String, context: FinderActionContext, settings: AppSettings) throws -> ActionExecutionResult {
        switch actionID {
        case ActionIDs.openTerminal:
            try tools.open(urls: [], using: .terminal, context: context)
            return .success(nil)
        case ActionIDs.openVSCode:
            try tools.open(urls: actionTargets(for: context), using: .vscode, context: context)
            return .success(nil)
        case ActionIDs.openCursor:
            try tools.open(urls: actionTargets(for: context), using: .cursor, context: context)
            return .success(nil)
        case ActionIDs.openZed:
            try tools.open(urls: actionTargets(for: context), using: .zed, context: context)
            return .success(nil)
        case ActionIDs.revealInFinder:
            NSWorkspace.shared.activateFileViewerSelecting(actionTargets(for: context))
            return .success(nil)
        default:
            if actionID.hasPrefix("open.custom.") {
                let customID = String(actionID.dropFirst("open.custom.".count))
                guard let customAction = settings.customActions.openActions.first(where: { $0.id == customID && $0.isEnabled }) else {
                    return .failure("未找到自定义打开动作")
                }
                try tools.openWithApplication(at: customAction.appPath, urls: actionTargets(for: context))
                return .success(nil)
            }
            return .failure("不支持的打开动作")
        }
    }
}

final class ClipboardActionHandler: ActionHandler, ActionContextResolving {
    var actionIDs: [String] { [ActionIDs.copyPath, ActionIDs.copyRelativePath] }

    func canPerform(actionID: String, context: FinderActionContext, settings: AppSettings) -> Bool { true }

    func perform(actionID: String, context: FinderActionContext, settings: AppSettings) throws -> ActionExecutionResult {
        let text: String
        switch actionID {
        case ActionIDs.copyPath:
            text = actionTargets(for: context).map(\.path).joined(separator: "\n")
        case ActionIDs.copyRelativePath:
            text = actionTargets(for: context).map { FileSystemHelper.relativePath(from: context.currentDirectoryURL, to: $0) }.joined(separator: "\n")
        default:
            text = ""
        }
        Logger.shared.info("clipboard", "Copy request \(actionID), targetCount=\(actionTargets(for: context).count), textLength=\(text.count)")
        NSPasteboard.general.clearContents()
        let success = NSPasteboard.general.setString(text, forType: .string)
        Logger.shared.info("clipboard", "Pasteboard setString success=\(success)")
        guard success else {
            return .failure("复制到剪贴板失败")
        }
        return .success("已复制到剪贴板")
    }
}

@MainActor
final class FileOperationActionHandler: ActionHandler, ActionContextResolving {
    var actionIDs: [String] { [ActionIDs.rename, ActionIDs.trash, ActionIDs.duplicate, ActionIDs.compress, ActionIDs.jsonFormat, ActionIDs.toggleExecutable] }

    func canPerform(actionID: String, context: FinderActionContext, settings: AppSettings) -> Bool { true }

    func perform(actionID: String, context: FinderActionContext, settings: AppSettings) throws -> ActionExecutionResult {
        switch actionID {
        case ActionIDs.rename:
            return try rename(context: context)
        case ActionIDs.trash:
            try trash(context: context)
            return .success("已移到废纸篓")
        case ActionIDs.duplicate:
            try duplicate(context: context)
            return .success("已复制目标")
        case ActionIDs.compress:
            try compress(context: context)
            return .success("已创建压缩包")
        case ActionIDs.jsonFormat:
            try formatJSON(context: context)
            return .success("JSON 已格式化")
        case ActionIDs.toggleExecutable:
            try toggleExecutable(context: context)
            return .success("可执行权限已切换")
        default:
            return .failure("不支持的文件操作")
        }
    }

    private func rename(context: FinderActionContext) throws -> ActionExecutionResult {
        guard let url = context.primaryURL else { throw HostCommandError.invalidContext("未找到重命名目标") }
        guard let name = PromptPanelController.promptForText(title: "Rename", message: "输入新名称", defaultValue: url.lastPathComponent) else {
            return .userCancelled
        }
        let destination = url.deletingLastPathComponent().appendingPathComponent(name)
        try FileManager.default.moveItem(at: url, to: destination)
        return .success("已重命名为：\(destination.lastPathComponent)")
    }

    private func trash(context: FinderActionContext) throws {
        for url in actionTargets(for: context) {
            var resultingItemURL: NSURL?
            try FileManager.default.trashItem(at: url, resultingItemURL: &resultingItemURL)
        }
    }

    private func duplicate(context: FinderActionContext) throws {
        for url in actionTargets(for: context) {
            let copyURL = url.deletingLastPathComponent().appendingPathComponent(url.deletingPathExtension().lastPathComponent + " copy" + (url.pathExtension.isEmpty ? "" : ".\(url.pathExtension)"))
            try FileManager.default.copyItem(at: url, to: copyURL)
        }
    }

    private func compress(context: FinderActionContext) throws {
        let targets = actionTargets(for: context)
        guard let first = targets.first else { throw HostCommandError.invalidContext("没有可压缩的目标") }
        guard let archiveName = PromptPanelController.promptForText(title: "Compress", message: "Archive name", defaultValue: first.deletingPathExtension().lastPathComponent + ".zip") else {
            throw HostCommandError.operationFailed("用户取消")
        }
        let cwd = first.deletingLastPathComponent()
        let args = ["-r", archiveName] + targets.map(\.lastPathComponent)
        try Process.runSync(URL(fileURLWithPath: "/usr/bin/zip"), arguments: args, currentDirectoryURL: cwd)
    }

    private func formatJSON(context: FinderActionContext) throws {
        guard let url = context.primaryURL else { throw HostCommandError.invalidContext("未找到 JSON 文件") }
        let data = try Data(contentsOf: url)
        let object = try JSONSerialization.jsonObject(with: data)
        let formatted = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
        try formatted.write(to: url, options: .atomic)
    }

    private func toggleExecutable(context: FinderActionContext) throws {
        guard let url = context.primaryURL else { throw HostCommandError.invalidContext("未找到文件") }
        let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
        let current = (attributes[.posixPermissions] as? NSNumber)?.intValue ?? 0o644
        let next = (current & 0o111) == 0 ? current | 0o755 : current & ~0o111
        try FileManager.default.setAttributes([.posixPermissions: next], ofItemAtPath: url.path)
    }
}

@MainActor
final class GitActionHandler: ActionHandler, ActionContextResolving {
    var actionIDs: [String] { [ActionIDs.gitStatus] }

    func canPerform(actionID: String, context: FinderActionContext, settings: AppSettings) -> Bool { true }

    func perform(actionID: String, context: FinderActionContext, settings: AppSettings) throws -> ActionExecutionResult {
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
        return .success(nil)
    }
}

@MainActor
final class AIActionHandler: ActionHandler {
    private let ai: AIService

    init(ai: AIService) {
        self.ai = ai
    }

    var actionIDs: [String] { [ActionIDs.aiAskClaude, ActionIDs.aiAskCodex] }

    func canPerform(actionID: String, context: FinderActionContext, settings: AppSettings) -> Bool {
        settings.aiEnabled
    }

    func perform(actionID: String, context: FinderActionContext, settings: AppSettings) throws -> ActionExecutionResult {
        ai.runAIAction(actionID: actionID, context: context)
        return .success(nil)
    }
}

final class ScriptActionHandler: ActionHandler, ActionContextResolving {
    private let tools: ExternalToolService

    init(tools: ExternalToolService) {
        self.tools = tools
    }

    var actionIDs: [String] { ["script.run."] }

    func canPerform(actionID: String, context: FinderActionContext, settings: AppSettings) -> Bool {
        actionID.hasPrefix("script.run.")
    }

    func perform(actionID: String, context: FinderActionContext, settings: AppSettings) throws -> ActionExecutionResult {
        let name = String(actionID.dropFirst("script.run.".count))
        let scriptURL = SharedPaths.scriptsDirectory().appendingPathComponent(name)
        try tools.runScript(at: scriptURL, in: context.workingDirectoryURL)
        return .success("已执行脚本：\(name)")
    }
}
