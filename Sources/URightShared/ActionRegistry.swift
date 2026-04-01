import Foundation

public struct RuntimeAction: Sendable {
    public let descriptor: ActionDescriptor
    public let isVisible: @Sendable (FinderActionContext, AppSettings) -> Bool
    public let isEnabled: @Sendable (FinderActionContext, AppSettings) -> Bool

    public init(
        descriptor: ActionDescriptor,
        isVisible: (@Sendable (FinderActionContext, AppSettings) -> Bool)? = nil,
        isEnabled: @escaping @Sendable (FinderActionContext, AppSettings) -> Bool = { _, _ in true }
    ) {
        self.descriptor = descriptor
        self.isVisible = isVisible ?? { context, _ in
            descriptor.supportedContexts.contains(context.selectionKind)
        }
        self.isEnabled = isEnabled
    }
}

public enum ActionIDs {
    public static let newFile = "create.new-file"
    public static let newFolder = "create.new-folder"
    public static let newFromTemplatePrefix = "create.template."
    public static let openTerminal = "open.terminal"
    public static let openGhostty = "open.ghostty"
    public static let openITerm = "open.iterm"
    public static let openVSCode = "open.vscode"
    public static let openCursor = "open.cursor"
    public static let openZed = "open.zed"
    public static let copyPath = "copy.path"
    public static let copyRelativePath = "copy.relative-path"
    public static let revealInFinder = "finder.reveal"
    public static let getInfo = "finder.info"
    public static let quickLook = "finder.quicklook"
    public static let duplicate = "file.duplicate"
    public static let rename = "file.rename"
    public static let trash = "file.trash"
    public static let compress = "file.compress"
    public static let showHidden = "view.toggle-hidden"
    public static let refresh = "view.refresh"
    public static let openContainingFolder = "file.open-containing-folder"
    public static let openDefault = "file.open-default"
    public static let editVSCode = "file.edit.vscode"
    public static let editCursor = "file.edit.cursor"
    public static let editZed = "file.edit.zed"
    public static let openTerminalHere = "file.open-terminal-here"
    public static let copyFilename = "copy.filename"
    public static let copyBasename = "copy.basename"
    public static let copyExtension = "copy.extension"
    public static let lineEndingLF = "file.line-ending.lf"
    public static let lineEndingCRLF = "file.line-ending.crlf"
    public static let markdownPreview = "file.markdown-preview"
    public static let jsonFormat = "file.json-format"
    public static let toggleExecutable = "file.toggle-executable"
    public static let sha256 = "file.sha256"
    public static let md5 = "file.md5"
    public static let pasteTerminalPath = "folder.paste-terminal-path"
    public static let gitStatus = "git.status"
    public static let gitGUI = "git.gui"
    public static let searchInFolder = "folder.search"
    public static let countItems = "folder.count"
    public static let folderSize = "folder.size"
    public static let sessionHidden = "folder.session-hidden"
    public static let openAllVSCode = "multi.open-all.vscode"
    public static let openAllCursor = "multi.open-all.cursor"
    public static let compressSelected = "multi.compress"
    public static let copyAllPaths = "multi.copy-paths"
    public static let batchRename = "multi.batch-rename"
    public static let moveAllToTrash = "multi.trash"
    public static let aiSummarizeSelection = "ai.summarize-selection"
    public static let aiAskSelection = "ai.ask-selection"
    public static let aiAskClaude = "ai.ask-claude"
    public static let aiAskCodex = "ai.ask-codex"
    public static let aiExplainProject = "ai.explain-project"
    public static let aiSummarizeFiles = "ai.summarize-files"
    public static let aiGenerateReadme = "ai.generate-readme"
    public static let aiGenerateGitignore = "ai.generate-gitignore"
    public static let aiReviewCode = "ai.review-code"
    public static let aiRefactorFile = "ai.refactor-file"
    public static let aiWriteTests = "ai.write-tests"
    public static let aiExplainError = "ai.explain-error"
    public static let aiJSONSchema = "ai.json-schema"
    public static let aiCommitMessage = "ai.commit-message"
    public static let aiPRSummary = "ai.pr-summary"
    public static let repeatLastAIAction = "ai.repeat-last"
}

public enum ActionRegistry {
    public static func topLevelActions(context: FinderActionContext, settings: AppSettings) -> [ActionDescriptor] {
        let tools = context.detectedTools
        let base: [RuntimeAction] = [
            .init(descriptor: .init(id: ActionIDs.newFile, title: "New File...", systemImageName: "plus.square.on.square", category: .create, supportedContexts: [.folder, .empty])),
            .init(descriptor: .init(id: ActionIDs.newFolder, title: "New Folder", systemImageName: "folder.badge.plus", category: .create, supportedContexts: [.folder, .empty])),
            .init(descriptor: .init(id: ActionIDs.openTerminal, title: "Open in Terminal", systemImageName: "terminal", category: .open, supportedContexts: SelectionKind.allCases)),
            .init(descriptor: .init(id: ActionIDs.openGhostty, title: "Open in Ghostty", systemImageName: "bolt.horizontal.circle", category: .open, supportedContexts: SelectionKind.allCases, statusBadge: tools[.ghostty]?.isInstalled == true ? "✓" : nil), isEnabled: { _, _ in tools[.ghostty]?.isInstalled == true }),
            .init(descriptor: .init(id: ActionIDs.openITerm, title: "Open in iTerm", systemImageName: "greaterthan.circle", category: .open, supportedContexts: SelectionKind.allCases, statusBadge: tools[.iTerm]?.isInstalled == true ? "✓" : nil), isEnabled: { _, _ in tools[.iTerm]?.isInstalled == true }),
            .init(descriptor: .init(id: ActionIDs.openVSCode, title: "Open in VS Code", systemImageName: "chevron.left.forwardslash.chevron.right", category: .open, supportedContexts: SelectionKind.allCases, statusBadge: tools[.vscode]?.isInstalled == true ? "✓" : nil), isEnabled: { _, _ in tools[.vscode]?.isInstalled == true }),
            .init(descriptor: .init(id: ActionIDs.openCursor, title: "Open in Cursor", systemImageName: "cursorarrow.rays", category: .open, supportedContexts: SelectionKind.allCases, statusBadge: tools[.cursor]?.isInstalled == true ? "✓" : nil), isEnabled: { _, _ in tools[.cursor]?.isInstalled == true }),
            .init(descriptor: .init(id: ActionIDs.openZed, title: "Open in Zed", systemImageName: "bolt.badge.a", category: .open, supportedContexts: SelectionKind.allCases, statusBadge: tools[.zed]?.isInstalled == true ? "✓" : nil), isEnabled: { _, _ in tools[.zed]?.isInstalled == true }),
            .init(descriptor: .init(id: ActionIDs.copyPath, title: "Copy Path", systemImageName: "document.on.document", category: .clipboard, supportedContexts: SelectionKind.allCases)),
            .init(descriptor: .init(id: ActionIDs.copyRelativePath, title: "Copy Relative Path", systemImageName: "arrowshape.turn.up.backward.2", category: .clipboard, supportedContexts: [.file, .folder, .multi])),
            .init(descriptor: .init(id: ActionIDs.revealInFinder, title: "Reveal in Finder", systemImageName: "finder", category: .view, supportedContexts: [.file, .folder, .multi])),
            .init(descriptor: .init(id: ActionIDs.getInfo, title: "Get Info", systemImageName: "info.circle", category: .view, supportedContexts: [.file, .folder, .multi])),
            .init(descriptor: .init(id: ActionIDs.quickLook, title: "Quick Look", systemImageName: "eye", category: .view, supportedContexts: [.file, .folder, .multi])),
            .init(descriptor: .init(id: ActionIDs.duplicate, title: "Duplicate", systemImageName: "plus.square.on.square", category: .fileOps, supportedContexts: [.file, .folder, .multi])),
            .init(descriptor: .init(id: ActionIDs.rename, title: "Rename", systemImageName: "pencil", category: .fileOps, supportedContexts: [.file, .folder])),
            .init(descriptor: .init(id: ActionIDs.trash, title: "Move to Trash", systemImageName: "trash", category: .fileOps, supportedContexts: [.file, .folder, .multi])),
            .init(descriptor: .init(id: ActionIDs.compress, title: "Compress", systemImageName: "archivebox", category: .fileOps, supportedContexts: [.file, .folder, .multi])),
            .init(descriptor: .init(id: ActionIDs.showHidden, title: "Show Hidden Files Here", systemImageName: "eye.slash", category: .view, supportedContexts: [.folder, .empty])),
            .init(descriptor: .init(id: ActionIDs.refresh, title: "Refresh Finder Window", systemImageName: "arrow.clockwise", category: .view, supportedContexts: SelectionKind.allCases))
        ]

        let fileSpecific: [ActionDescriptor] = [
            .init(id: ActionIDs.openContainingFolder, title: "Open Containing Folder", systemImageName: "folder", category: .open, supportedContexts: [.file]),
            .init(id: ActionIDs.openDefault, title: "Open With Default App", systemImageName: "play.circle", category: .open, supportedContexts: [.file]),
            .init(id: ActionIDs.editVSCode, title: "Edit in VS Code", systemImageName: "chevron.left.forwardslash.chevron.right", category: .open, supportedContexts: [.file]),
            .init(id: ActionIDs.editCursor, title: "Edit in Cursor", systemImageName: "cursorarrow.rays", category: .open, supportedContexts: [.file]),
            .init(id: ActionIDs.editZed, title: "Edit in Zed", systemImageName: "bolt.badge.a", category: .open, supportedContexts: [.file]),
            .init(id: ActionIDs.openTerminalHere, title: "Open in Terminal Here", systemImageName: "terminal", category: .open, supportedContexts: [.file]),
            .init(id: ActionIDs.copyFilename, title: "Copy Filename", systemImageName: "doc.on.doc", category: .clipboard, supportedContexts: [.file]),
            .init(id: ActionIDs.copyBasename, title: "Copy Basename", systemImageName: "text.cursor", category: .clipboard, supportedContexts: [.file]),
            .init(id: ActionIDs.copyExtension, title: "Copy Extension", systemImageName: "tag", category: .clipboard, supportedContexts: [.file]),
            .init(id: "file.line-ending", title: "Convert Line Endings", systemImageName: "arrow.left.arrow.right", category: .fileOps, supportedContexts: [.file], children: [
                .init(id: ActionIDs.lineEndingLF, title: "LF", systemImageName: "arrow.down.to.line", category: .fileOps, supportedContexts: [.file]),
                .init(id: ActionIDs.lineEndingCRLF, title: "CRLF", systemImageName: "arrow.up.and.down.text.horizontal", category: .fileOps, supportedContexts: [.file])
            ]),
            .init(id: ActionIDs.markdownPreview, title: "Markdown Preview", systemImageName: "doc.richtext", category: .view, supportedContexts: [.file]),
            .init(id: ActionIDs.jsonFormat, title: "JSON Format", systemImageName: "curlybraces", category: .fileOps, supportedContexts: [.file]),
            .init(id: ActionIDs.toggleExecutable, title: "Toggle Executable Bit", systemImageName: "gearshape.2", category: .fileOps, supportedContexts: [.file]),
            .init(id: ActionIDs.sha256, title: "Calculate SHA256", systemImageName: "number", category: .advanced, supportedContexts: [.file]),
            .init(id: ActionIDs.md5, title: "Calculate MD5", systemImageName: "number.circle", category: .advanced, supportedContexts: [.file])
        ]

        let folderSpecific: [ActionDescriptor] = [
            .init(id: "folder.new-text", title: "New Text File", systemImageName: "doc.text", category: .create, supportedContexts: [.folder, .empty]),
            .init(id: "folder.new-markdown", title: "New Markdown File", systemImageName: "doc.richtext", category: .create, supportedContexts: [.folder, .empty]),
            .init(id: "folder.new-json", title: "New JSON File", systemImageName: "curlybraces", category: .create, supportedContexts: [.folder, .empty]),
            .init(id: "folder.new-python", title: "New Python File", systemImageName: "chevron.left.forwardslash.chevron.right", category: .create, supportedContexts: [.folder, .empty]),
            .init(id: "folder.new-shell", title: "New Shell Script", systemImageName: "terminal", category: .create, supportedContexts: [.folder, .empty]),
            .init(id: "folder.new-gitignore", title: "New .gitignore", systemImageName: "nosign", category: .create, supportedContexts: [.folder, .empty]),
            .init(id: "folder.new-readme", title: "New README.md", systemImageName: "book", category: .create, supportedContexts: [.folder, .empty]),
            .init(id: ActionIDs.pasteTerminalPath, title: "Paste Terminal Path", systemImageName: "terminal", category: .clipboard, supportedContexts: [.folder, .empty]),
            .init(id: ActionIDs.gitStatus, title: "Open Git Status Here", systemImageName: "point.topleft.down.curvedto.point.bottomright.up", category: .git, supportedContexts: [.folder, .empty]),
            .init(id: ActionIDs.gitGUI, title: "Open Git GUI Here", systemImageName: "square.stack.3d.up", category: .git, supportedContexts: [.folder, .empty]),
            .init(id: ActionIDs.searchInFolder, title: "Search in Folder", systemImageName: "magnifyingglass", category: .advanced, supportedContexts: [.folder, .empty]),
            .init(id: ActionIDs.countItems, title: "Count Items", systemImageName: "number.square", category: .advanced, supportedContexts: [.folder, .empty]),
            .init(id: ActionIDs.folderSize, title: "Folder Size", systemImageName: "externaldrive.badge.timemachine", category: .advanced, supportedContexts: [.folder, .empty]),
            .init(id: ActionIDs.sessionHidden, title: "Toggle Hidden Files for This Folder Session", systemImageName: "eye.trianglebadge.exclamationmark", category: .view, supportedContexts: [.folder, .empty])
        ]

        let multiSpecific: [ActionDescriptor] = [
            .init(id: ActionIDs.openAllVSCode, title: "Open All in VS Code", systemImageName: "chevron.left.forwardslash.chevron.right", category: .open, supportedContexts: [.multi]),
            .init(id: ActionIDs.openAllCursor, title: "Open All in Cursor", systemImageName: "cursorarrow.rays", category: .open, supportedContexts: [.multi]),
            .init(id: ActionIDs.compressSelected, title: "Compress Selected", systemImageName: "archivebox", category: .fileOps, supportedContexts: [.multi]),
            .init(id: ActionIDs.copyAllPaths, title: "Copy All Paths", systemImageName: "list.bullet.rectangle", category: .clipboard, supportedContexts: [.multi]),
            .init(id: ActionIDs.batchRename, title: "Batch Rename...", systemImageName: "character.cursor.ibeam", category: .fileOps, supportedContexts: [.multi]),
            .init(id: ActionIDs.moveAllToTrash, title: "Move All to Trash", systemImageName: "trash", category: .fileOps, supportedContexts: [.multi]),
            .init(id: ActionIDs.aiSummarizeSelection, title: "AI Summarize Selection", systemImageName: "sparkles.rectangle.stack", category: .ai, supportedContexts: [.multi]),
            .init(id: ActionIDs.aiAskSelection, title: "AI Ask About Selection", systemImageName: "questionmark.bubble", category: .ai, supportedContexts: [.multi])
        ]

        let aiChildren: [ActionDescriptor] = [
            .init(id: ActionIDs.aiAskClaude, title: "Ask Claude About This", systemImageName: "sparkles", category: .ai, supportedContexts: SelectionKind.allCases, statusBadge: tools[.claude]?.isInstalled == true ? "CLI" : nil),
            .init(id: ActionIDs.aiAskCodex, title: "Ask Codex About This", systemImageName: "brain", category: .ai, supportedContexts: SelectionKind.allCases, statusBadge: tools[.codex]?.isInstalled == true ? "CLI" : nil),
            .init(id: ActionIDs.aiExplainProject, title: "Explain This Project", systemImageName: "folder.badge.questionmark", category: .ai, supportedContexts: [.folder, .empty, .multi]),
            .init(id: ActionIDs.aiSummarizeFiles, title: "Summarize Files", systemImageName: "doc.text.magnifyingglass", category: .ai, supportedContexts: SelectionKind.allCases),
            .init(id: ActionIDs.aiGenerateReadme, title: "Generate README", systemImageName: "book.pages", category: .ai, supportedContexts: [.folder, .empty, .multi]),
            .init(id: ActionIDs.aiGenerateGitignore, title: "Generate .gitignore", systemImageName: "nosign", category: .ai, supportedContexts: [.folder, .empty]),
            .init(id: ActionIDs.aiReviewCode, title: "Review Code", systemImageName: "checkmark.seal.text.page", category: .ai, supportedContexts: [.file, .folder, .multi]),
            .init(id: ActionIDs.aiRefactorFile, title: "Refactor This File", systemImageName: "wand.and.stars", category: .ai, supportedContexts: [.file]),
            .init(id: ActionIDs.aiWriteTests, title: "Write Tests For This", systemImageName: "testtube.2", category: .ai, supportedContexts: [.file, .folder]),
            .init(id: ActionIDs.aiExplainError, title: "Explain Error Log", systemImageName: "exclamationmark.bubble", category: .ai, supportedContexts: [.file]),
            .init(id: ActionIDs.aiJSONSchema, title: "Convert to JSON Schema", systemImageName: "curlybraces.square", category: .ai, supportedContexts: [.file]),
            .init(id: ActionIDs.aiCommitMessage, title: "Draft Commit Message", systemImageName: "text.redaction", category: .ai, supportedContexts: [.folder, .empty, .multi]),
            .init(id: ActionIDs.aiPRSummary, title: "Draft PR Summary", systemImageName: "rectangle.and.pencil.and.ellipsis", category: .ai, supportedContexts: [.folder, .empty, .multi]),
            .init(id: ActionIDs.repeatLastAIAction, title: "Repeat Last AI Action", systemImageName: "arrow.clockwise.circle", category: .ai, supportedContexts: SelectionKind.allCases)
        ]

        let templateChildren = BuiltInTemplates.all.map {
            ActionDescriptor(id: ActionIDs.newFromTemplatePrefix + $0.id, title: $0.title, systemImageName: "doc.badge.plus", category: .templates, supportedContexts: [.folder, .empty])
        }

        let scriptsChildren = discoverScriptDescriptors()

        var descriptors = base.filter { $0.isVisible(context, settings) }.map(\.descriptor)
        descriptors.append(.init(id: "submenu.ai", title: "AI Actions", systemImageName: "sparkles", category: .ai, supportedContexts: SelectionKind.allCases, children: aiChildren))
        descriptors.append(.init(id: "submenu.open-with", title: "Open With", systemImageName: "square.and.arrow.up", category: .open, supportedContexts: SelectionKind.allCases, children: openWithDescriptors(for: context)))
        descriptors.append(.init(id: "submenu.templates", title: "New From Template", systemImageName: "doc.badge.plus", category: .templates, supportedContexts: [.folder, .empty], children: templateChildren))
        descriptors.append(.init(id: "submenu.scripts", title: "Scripts", systemImageName: "terminal.fill", category: .scripts, supportedContexts: SelectionKind.allCases, children: scriptsChildren))

        if context.selectionKind == .file {
            descriptors.append(contentsOf: fileSpecific)
        }
        if context.selectionKind == .folder || context.selectionKind == .empty {
            descriptors.append(contentsOf: folderSpecific)
        }
        if context.selectionKind == .multi {
            descriptors.append(contentsOf: multiSpecific)
        }

        return descriptors.filter { $0.supportedContexts.contains(context.selectionKind) }
    }

    private static func openWithDescriptors(for context: FinderActionContext) -> [ActionDescriptor] {
        let installed = context.detectedTools.filter { $0.value.isInstalled }.keys
        return [ToolKind.vscode, .cursor, .zed, .terminal, .ghostty, .iTerm].compactMap { kind in
            guard installed.contains(kind) else { return nil }
            return ActionDescriptor(id: "open-with.\(kind.rawValue)", title: label(for: kind), systemImageName: icon(for: kind), category: .open, supportedContexts: SelectionKind.allCases)
        }
    }

    private static func label(for kind: ToolKind) -> String {
        switch kind {
        case .terminal: return "Terminal"
        case .ghostty: return "Ghostty"
        case .iTerm: return "iTerm"
        case .vscode: return "VS Code"
        case .cursor: return "Cursor"
        case .zed: return "Zed"
        case .claude: return "Claude"
        case .codex: return "Codex"
        case .gh: return "GitHub CLI"
        case .lazygit: return "lazygit"
        case .gitup: return "GitUp"
        }
    }

    private static func icon(for kind: ToolKind) -> String {
        switch kind {
        case .terminal: return "terminal"
        case .ghostty: return "bolt.horizontal.circle"
        case .iTerm: return "greaterthan.circle"
        case .vscode: return "chevron.left.forwardslash.chevron.right"
        case .cursor: return "cursorarrow.rays"
        case .zed: return "bolt.badge.a"
        case .claude: return "sparkles"
        case .codex: return "brain"
        case .gh, .lazygit, .gitup: return "point.topleft.down.curvedto.point.bottomright.up"
        }
    }

    private static func discoverScriptDescriptors() -> [ActionDescriptor] {
        let urls = (try? FileManager.default.contentsOfDirectory(at: SharedPaths.scriptsDirectory(), includingPropertiesForKeys: nil)) ?? []
        return urls.filter { $0.pathExtension != "" }.map {
            ActionDescriptor(id: "script.run.\($0.lastPathComponent)", title: $0.deletingPathExtension().lastPathComponent, systemImageName: "terminal", category: .scripts, supportedContexts: SelectionKind.allCases)
        }
    }
}
