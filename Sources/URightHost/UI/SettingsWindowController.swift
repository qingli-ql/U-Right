import AppKit
import URightShared

@MainActor
final class SettingsWindowController: NSWindowController {
    private var settings = SettingsStore.shared.load()

    private let launchAtLogin = NSButton(checkboxWithTitle: "Launch at Login", target: nil, action: nil)
    private let showMenuBarIcon = NSButton(checkboxWithTitle: "Show menu bar icon", target: nil, action: nil)
    private let showExtensionStatus = NSButton(checkboxWithTitle: "Enable Finder extension status indicator", target: nil, action: nil)
    private let aiEnabled = NSButton(checkboxWithTitle: "Enable AI actions", target: nil, action: nil)
    private let includeHidden = NSButton(checkboxWithTitle: "Include hidden files", target: nil, action: nil)
    private let debugLogging = NSButton(checkboxWithTitle: "Debug logging", target: nil, action: nil)

    private let defaultTerminal = NSPopUpButton()
    private let defaultEditor = NSPopUpButton()
    private let preferredProvider = NSPopUpButton()
    private let apiBaseURL = NSTextField(string: "")
    private let apiKey = NSSecureTextField(string: "")
    private let apiModel = NSTextField(string: "")
    private let systemPrompt = NSTextField(string: "")
    private let maxFileSize = NSTextField(string: "")
    private let maxDepth = NSTextField(string: "")
    private let templateFolder = NSTextField(string: "")
    private let customPaths = NSTextView()

    init() {
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 720, height: 620), styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        window.title = "U-Right Settings"
        super.init(window: window)
        configure()
        loadValues()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    private func configure() {
        defaultTerminal.addItems(withTitles: ["terminal", "ghostty", "iTerm"])
        defaultEditor.addItems(withTitles: ["vscode", "cursor", "zed"])
        preferredProvider.addItems(withTitles: AIProvider.allCases.map(\.rawValue))

        let tabs = NSTabView(frame: window?.contentView?.bounds ?? .zero)
        tabs.translatesAutoresizingMaskIntoConstraints = false
        tabs.addTabViewItem(tab(title: "General", content: generalView()))
        tabs.addTabViewItem(tab(title: "AI", content: aiView()))
        tabs.addTabViewItem(tab(title: "Templates", content: templatesView()))
        tabs.addTabViewItem(tab(title: "Advanced", content: advancedView()))

        let save = NSButton(title: "Save", target: self, action: #selector(saveSettings))
        let reset = NSButton(title: "Reset", target: self, action: #selector(resetSettings))
        let revealLogs = NSButton(title: "Reveal Logs", target: self, action: #selector(revealLogsAction))
        let buttons = NSStackView(views: [save, reset, revealLogs])
        buttons.orientation = .horizontal
        buttons.spacing = 8
        buttons.edgeInsets = NSEdgeInsets(top: 8, left: 12, bottom: 12, right: 12)

        let root = NSStackView(views: [tabs, buttons])
        root.orientation = .vertical
        root.translatesAutoresizingMaskIntoConstraints = false

        let content = NSView()
        content.addSubview(root)
        NSLayoutConstraint.activate([
            root.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            root.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            root.topAnchor.constraint(equalTo: content.topAnchor),
            root.bottomAnchor.constraint(equalTo: content.bottomAnchor)
        ])
        window?.contentView = content
    }

    private func tab(title: String, content: NSView) -> NSTabViewItem {
        let item = NSTabViewItem(identifier: title)
        item.label = title
        item.view = content
        return item
    }

    private func generalView() -> NSView {
        form([
            launchAtLogin,
            showMenuBarIcon,
            showExtensionStatus,
            labeled("Default terminal", defaultTerminal),
            labeled("Default editor", defaultEditor)
        ])
    }

    private func aiView() -> NSView {
        form([
            aiEnabled,
            labeled("Preferred provider", preferredProvider),
            labeled("API Base URL", apiBaseURL),
            labeled("API Key", apiKey),
            labeled("Model", apiModel),
            labeled("System Prompt", systemPrompt),
            labeled("Max file size", maxFileSize),
            labeled("Max folder depth", maxDepth),
            includeHidden,
            NSButton(title: "Test Connection", target: self, action: #selector(testConnection))
        ])
    }

    private func templatesView() -> NSView {
        form([
            labeled("Custom template folder", templateFolder),
            NSButton(title: "Reload Templates", target: self, action: #selector(reloadTemplates))
        ])
    }

    private func advancedView() -> NSView {
        let scroll = NSScrollView(frame: NSRect(x: 0, y: 0, width: 560, height: 180))
        customPaths.string = "claude=/usr/local/bin/claude\ncodex=/usr/local/bin/codex\nghostty=/Applications/Ghostty.app\ncode=/usr/local/bin/code\ncursor=/usr/local/bin/cursor\nzed=/usr/local/bin/zed"
        customPaths.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        scroll.documentView = customPaths
        scroll.hasVerticalScroller = true
        return form([
            debugLogging,
            labeled("Custom executable paths", scroll)
        ])
    }

    private func labeled(_ title: String, _ view: NSView) -> NSView {
        let label = NSTextField(labelWithString: title)
        let stack = NSStackView(views: [label, view])
        stack.orientation = .vertical
        stack.spacing = 4
        return stack
    }

    private func form(_ views: [NSView]) -> NSView {
        let stack = NSStackView(views: views)
        stack.orientation = .vertical
        stack.spacing = 10
        stack.edgeInsets = NSEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
        let container = NSView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: container.bottomAnchor)
        ])
        return container
    }

    private func loadValues() {
        settings = SettingsStore.shared.load()
        launchAtLogin.state = settings.launchAtLogin ? .on : .off
        showMenuBarIcon.state = settings.showMenuBarIcon ? .on : .off
        showExtensionStatus.state = settings.showExtensionStatus ? .on : .off
        aiEnabled.state = settings.aiEnabled ? .on : .off
        includeHidden.state = settings.includeHiddenFiles ? .on : .off
        debugLogging.state = settings.debugLogging ? .on : .off
        defaultTerminal.selectItem(withTitle: settings.defaultTerminal.rawValue)
        defaultEditor.selectItem(withTitle: settings.defaultEditor.rawValue)
        preferredProvider.selectItem(withTitle: settings.preferredAIProvider.rawValue)
        apiBaseURL.stringValue = settings.apiBaseURL
        apiKey.stringValue = settings.apiKey
        apiModel.stringValue = settings.apiModel
        systemPrompt.stringValue = settings.systemPromptTemplate
        maxFileSize.stringValue = String(settings.maxContextFileSize)
        maxDepth.stringValue = String(settings.maxFolderScanDepth)
        templateFolder.stringValue = settings.customTemplateFolder
        customPaths.string = settings.customExecutablePaths.map { "\($0.key)=\($0.value)" }.sorted().joined(separator: "\n")
    }

    @objc private func saveSettings() {
        settings.launchAtLogin = launchAtLogin.state == .on
        settings.showMenuBarIcon = showMenuBarIcon.state == .on
        settings.showExtensionStatus = showExtensionStatus.state == .on
        settings.aiEnabled = aiEnabled.state == .on
        settings.includeHiddenFiles = includeHidden.state == .on
        settings.debugLogging = debugLogging.state == .on
        settings.defaultTerminal = ToolKind(rawValue: defaultTerminal.titleOfSelectedItem ?? "terminal") ?? .terminal
        settings.defaultEditor = ToolKind(rawValue: defaultEditor.titleOfSelectedItem ?? "vscode") ?? .vscode
        settings.preferredAIProvider = AIProvider(rawValue: preferredProvider.titleOfSelectedItem ?? "auto") ?? .auto
        settings.apiBaseURL = apiBaseURL.stringValue
        settings.apiKey = apiKey.stringValue
        settings.apiModel = apiModel.stringValue
        settings.systemPromptTemplate = systemPrompt.stringValue
        settings.maxContextFileSize = Int(maxFileSize.stringValue) ?? 64_000
        settings.maxFolderScanDepth = Int(maxDepth.stringValue) ?? 3
        settings.customTemplateFolder = templateFolder.stringValue
        settings.customExecutablePaths = Dictionary(uniqueKeysWithValues: customPaths.string.split(separator: "\n").compactMap {
            let parts = $0.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { return nil }
            return (parts[0], parts[1])
        })
        SettingsStore.shared.save(settings)
        PromptPanelController.showInfo(title: "Saved", message: "设置已保存。")
    }

    @objc private func resetSettings() {
        settings = AppSettings()
        SettingsStore.shared.save(settings)
        loadValues()
    }

    @objc private func revealLogsAction() {
        NSWorkspace.shared.activateFileViewerSelecting([SharedPaths.logFileURL()])
    }

    @objc private func reloadTemplates() {
        PromptPanelController.showInfo(title: "Templates", message: "模板目录已重新读取。")
    }

    @objc private func testConnection() {
        let detector = ToolDetector.shared.detect(settings: settings)
        let message = ["Claude CLI: \(detector[.claude]?.isInstalled == true ? "Yes" : "No")", "Codex CLI: \(detector[.codex]?.isInstalled == true ? "Yes" : "No")", "API Base: \(settings.apiBaseURL)"]
            .joined(separator: "\n")
        PromptPanelController.showInfo(title: "AI Status", message: message)
    }
}
