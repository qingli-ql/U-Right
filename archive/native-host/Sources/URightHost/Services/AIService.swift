import AppKit
import Foundation
import URightShared

@MainActor
final class AIService {
    private var resultWindows: [ResultWindowController] = []

    func runAIAction(actionID: String, context: FinderActionContext) {
        let settings = SettingsStore.shared.load()
        guard settings.aiEnabled else {
            PromptPanelController.showError("AI 功能已在设置中禁用。")
            return
        }

        let provider = providerForAction(actionID: actionID, settings: settings, tools: context.detectedTools)
        let prompt = buildPrompt(actionID: actionID, context: context, settings: settings)
        guard let editedPrompt = PromptPanelController.promptForMultilineText(title: prompt.title, message: "发送前可编辑提示词", defaultValue: prompt.body) else {
            return
        }

        var updated = settings
        updated.lastAIActionID = actionID
        updated.recentActionIDs = Array(([actionID] + updated.recentActionIDs).prefix(12))
        SettingsStore.shared.save(updated)

        let targetFile = context.selectionKind == .file ? context.primaryURL : nil
        let payload = AIResultPayload(title: prompt.title, markdown: "", workingDirectory: context.workingDirectoryURL, suggestedFileURL: targetFile, canApplyToFile: targetFile != nil)
        let window = ResultWindowController(payload: payload, onApply: { [weak self] text in
            self?.apply(text: text, to: targetFile)
        }, onOpenInEditor: {
            if let targetFile {
                _ = try? ExternalToolService().open(urls: [targetFile], using: updated.defaultEditor, context: context)
            }
        })
        resultWindows.append(window)
        window.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)

        switch provider {
        case .claudeCLI:
            runCLI(named: "claude", actionID: actionID, prompt: editedPrompt, context: context, window: window)
        case .codexCLI:
            runCLI(named: "codex", actionID: actionID, prompt: editedPrompt, context: context, window: window)
        case .openAICompatible:
            runAPI(prompt: editedPrompt, context: context, settings: updated, window: window)
        case .auto:
            if context.detectedTools[.claude]?.isInstalled == true {
                runCLI(named: "claude", actionID: actionID, prompt: editedPrompt, context: context, window: window)
            } else if context.detectedTools[.codex]?.isInstalled == true {
                runCLI(named: "codex", actionID: actionID, prompt: editedPrompt, context: context, window: window)
            } else {
                runAPI(prompt: editedPrompt, context: context, settings: updated, window: window)
            }
        }
    }

    private func providerForAction(actionID: String, settings: AppSettings, tools: [ToolKind: ToolAvailability]) -> AIProvider {
        if actionID == ActionIDs.aiAskClaude { return tools[.claude]?.isInstalled == true ? .claudeCLI : .openAICompatible }
        if actionID == ActionIDs.aiAskCodex { return tools[.codex]?.isInstalled == true ? .codexCLI : .openAICompatible }
        switch settings.preferredAIProvider {
        case .auto:
            if tools[.claude]?.isInstalled == true { return .claudeCLI }
            if tools[.codex]?.isInstalled == true { return .codexCLI }
            return .openAICompatible
        default:
            return settings.preferredAIProvider
        }
    }

    private func runCLI(named command: String, actionID: String, prompt: String, context: FinderActionContext, window: ResultWindowController) {
        guard let executable = context.detectedTools[command == "claude" ? .claude : .codex]?.executablePath else {
            PromptPanelController.showError("未检测到 \(command) CLI，请在 Settings 中配置或改用 API。")
            return
        }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.currentDirectoryURL = context.workingDirectoryURL
        process.arguments = command == "claude" ? ["--print", prompt] : ["exec", prompt]

        let out = Pipe()
        let err = Pipe()
        process.standardOutput = out
        process.standardError = err

        out.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            guard !data.isEmpty, let chunk = String(data: data, encoding: .utf8) else { return }
            Task { @MainActor in
                window.appendStreamingText(chunk)
            }
        }
        err.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            guard !data.isEmpty, let chunk = String(data: data, encoding: .utf8) else { return }
            Task { @MainActor in
                window.appendStreamingText("\n[stderr]\n\(chunk)")
            }
        }

        do {
            try process.run()
            process.terminationHandler = { _ in
                out.fileHandleForReading.readabilityHandler = nil
                err.fileHandleForReading.readabilityHandler = nil
            }
        } catch {
            PromptPanelController.showError(error.localizedDescription)
        }
    }

    private func runAPI(prompt: String, context: FinderActionContext, settings: AppSettings, window: ResultWindowController) {
        guard !settings.apiKey.isEmpty else {
            PromptPanelController.showError("CLI 不可用，且未配置 API Key。请前往 Settings 配置 OpenAI-compatible API。")
            return
        }

        let endpoint = URL(string: settings.apiBaseURL + "/chat/completions")!
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("Bearer \(settings.apiKey)", forHTTPHeaderField: "Authorization")
        let body: [String: Any] = [
            "model": settings.apiModel,
            "messages": [
                ["role": "system", "content": settings.systemPromptTemplate],
                ["role": "user", "content": prompt]
            ]
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, _, error in
            if let error {
                DispatchQueue.main.async { PromptPanelController.showError(error.localizedDescription) }
                return
            }
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let choices = json["choices"] as? [[String: Any]],
                  let message = choices.first?["message"] as? [String: Any],
                  let content = message["content"] as? String else {
                DispatchQueue.main.async { PromptPanelController.showError("API 返回解析失败。") }
                return
            }
            Task { @MainActor in
                window.appendStreamingText(content)
            }
        }.resume()
    }

    private func buildPrompt(actionID: String, context: FinderActionContext, settings: AppSettings) -> (title: String, body: String) {
        let contextSummary = summarizeContext(context: context, settings: settings)
        let title: String = switch actionID {
        case ActionIDs.aiAskClaude: "Ask Claude About This"
        case ActionIDs.aiAskCodex: "Ask Codex About This"
        case ActionIDs.aiExplainProject: "Explain This Project"
        case ActionIDs.aiGenerateReadme: "Generate README"
        case ActionIDs.aiReviewCode: "Review Code"
        default: "AI Action"
        }
        let task: String = switch actionID {
        case ActionIDs.aiAskClaude, ActionIDs.aiAskCodex: "Answer questions about the selected Finder context."
        case ActionIDs.aiExplainProject: "Explain the selected project structure, key components, and likely workflow."
        case ActionIDs.aiSummarizeFiles, ActionIDs.aiSummarizeSelection: "Summarize the selected files clearly and concisely."
        case ActionIDs.aiGenerateReadme: "Generate a practical README based on the selected context."
        case ActionIDs.aiGenerateGitignore: "Draft a .gitignore for this folder."
        case ActionIDs.aiReviewCode: "Review the code and call out bugs, risks, and improvements."
        case ActionIDs.aiRefactorFile: "Refactor this file and explain the changes."
        case ActionIDs.aiWriteTests: "Write or suggest tests for the selected code."
        case ActionIDs.aiExplainError: "Explain the error log and suggest fixes."
        case ActionIDs.aiJSONSchema: "Convert the provided JSON or sample data into a JSON Schema."
        case ActionIDs.aiCommitMessage: "Draft a commit message from the current worktree context."
        case ActionIDs.aiPRSummary: "Draft a pull request summary."
        default: "Help with the selected Finder context."
        }
        return (title, "\(settings.systemPromptTemplate)\n\nTask:\n\(task)\n\nContext:\n\(contextSummary)")
    }

    private func summarizeContext(context: FinderActionContext, settings: AppSettings) -> String {
        switch context.selectionKind {
        case .file:
            guard let file = context.primaryURL else { return "No file selected." }
            let content = limitedFileContent(at: file, maxBytes: settings.maxContextFileSize)
            return "File: \(file.lastPathComponent)\nPath: \(file.path)\n\nContent:\n\(content)"
        case .folder, .empty:
            let directory = context.selectionKind == .folder ? context.primaryURL : context.currentDirectoryURL
            guard let directory else { return "No folder context." }
            return folderSummary(at: directory, settings: settings)
        case .multi:
            return context.selectedURLs.map { url in
                let summary = FileSystemHelper.metadata(for: url).isDirectory ? folderSummary(at: url, settings: settings) : limitedFileContent(at: url, maxBytes: min(8_000, settings.maxContextFileSize))
                return "Item: \(url.path)\n\(summary)"
            }.joined(separator: "\n\n")
        case .mixed:
            return context.selectedURLs.map(\.path).joined(separator: "\n")
        }
    }

    private func folderSummary(at directory: URL, settings: AppSettings) -> String {
        var lines: [String] = ["Folder: \(directory.path)"]
        let enumerator = FileManager.default.enumerator(at: directory, includingPropertiesForKeys: [.isDirectoryKey, .fileSizeKey], options: settings.includeHiddenFiles ? [] : [.skipsHiddenFiles])
        var count = 0
        while let url = enumerator?.nextObject() as? URL, count < 80 {
            let depth = url.pathComponents.count - directory.pathComponents.count
            if depth > settings.maxFolderScanDepth {
                enumerator?.skipDescendants()
                continue
            }
            lines.append(String(repeating: "  ", count: max(depth - 1, 0)) + "- " + url.lastPathComponent)
            count += 1
        }
        return lines.joined(separator: "\n")
    }

    private func limitedFileContent(at url: URL, maxBytes: Int) -> String {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return "<unable to read file>" }
        defer { try? handle.close() }
        let data = try? handle.read(upToCount: maxBytes)
        return String(data: data ?? Data(), encoding: .utf8) ?? "<binary or non-utf8 content>"
    }

    private func apply(text: String, to url: URL?) {
        guard let url else { return }
        do {
            try text.data(using: .utf8)?.write(to: url, options: .atomic)
        } catch {
            PromptPanelController.showError(error.localizedDescription)
        }
    }
}
