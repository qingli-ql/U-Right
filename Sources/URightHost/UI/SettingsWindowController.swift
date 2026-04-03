import AppKit
import URightShared

@MainActor
final class SettingsWindowController: NSWindowController, NSTableViewDataSource, NSTableViewDelegate {
    private enum Section: CaseIterable {
        case general
        case contextMenu
        case integrations
        case ai
        case templates
        case customActions
        case advanced

        var title: String {
            switch self {
            case .general: return "General"
            case .contextMenu: return "Context Menu"
            case .integrations: return "Integrations"
            case .ai: return "AI"
            case .templates: return "Templates"
            case .customActions: return "Custom Actions"
            case .advanced: return "Advanced"
            }
        }

        var symbolName: String {
            switch self {
            case .general: return "gearshape"
            case .contextMenu: return "list.bullet.rectangle.portrait"
            case .integrations: return "wrench.and.screwdriver"
            case .ai: return "sparkles"
            case .templates: return "doc.badge.plus"
            case .customActions: return "app.badge"
            case .advanced: return "slider.horizontal.3"
            }
        }
    }

    private enum TableTag: Int {
        case categories = 1
        case actions = 2
        case tools = 3
    }

    private var settings = SettingsStore.shared.load()
    private var detectedTools: [ToolKind: ToolAvailability] = [:]
    private var previewSelectionKind: SelectionKind = .file

    private let launchAtLogin = NSButton(checkboxWithTitle: "Launch at Login", target: nil, action: nil)
    private let showMenuBarIcon = NSButton(checkboxWithTitle: "Show menu bar icon", target: nil, action: nil)
    private let showExtensionStatus = NSButton(checkboxWithTitle: "Enable Finder extension status indicator", target: nil, action: nil)
    private let aiEnabled = NSButton(checkboxWithTitle: "Enable AI actions", target: nil, action: nil)
    private let includeHidden = NSButton(checkboxWithTitle: "Include hidden files", target: nil, action: nil)
    private let debugLogging = NSButton(checkboxWithTitle: "Debug logging", target: nil, action: nil)
    private let showUnavailableInPreview = NSButton(checkboxWithTitle: "Show unavailable actions in preview", target: nil, action: nil)
    private let collapseSingleGroups = NSButton(checkboxWithTitle: "Collapse single-action groups", target: nil, action: nil)

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
    private let aiActionsField = NSTextField(string: "")
    private let templateSummaryView = NSTextView()
    private let customActionsSummaryView = NSTextView()

    private let categoryTable = NSTableView()
    private let actionTable = NSTableView()
    private let toolTable = NSTableView()
    private let previewTextView = NSTextView()
    private let previewSelector = NSSegmentedControl(labels: ["File", "Folder", "Multi", "Empty"], trackingMode: .selectOne, target: nil, action: nil)
    private let categoryEnabledCheckbox = NSButton(checkboxWithTitle: "Enable category", target: nil, action: nil)
    private let categoryDisplayStyle = NSPopUpButton()
    private let actionEnabledCheckbox = NSButton(checkboxWithTitle: "Enable action", target: nil, action: nil)
    private let actionCategoryPopup = NSPopUpButton()
    private let actionDetailsLabel = NSTextField(labelWithString: "选择动作查看详情")
    private let toolAllowActions = NSButton(checkboxWithTitle: "Allow dependent menu actions", target: nil, action: nil)
    private let toolCustomPath = NSTextField(string: "")
    private let toolStatusLabel = NSTextField(labelWithString: "选择工具查看状态")
    private let contentContainer = NSView()
    private var sectionButtons: [Section: NSButton] = [:]
    private var sectionViews: [Section: NSView] = [:]
    private var currentSection: Section = .contextMenu

    private var orderedCategories: [ActionCategory] {
        settings.contextMenu.categorySettings.sorted { $0.order < $1.order }.map(\.category)
    }

    private var selectedCategory: ActionCategory? {
        let row = categoryTable.selectedRow
        guard row >= 0, row < orderedCategories.count else { return orderedCategories.first }
        return orderedCategories[row]
    }

    private var actionsForSelectedCategory: [ActionDefinition] {
        guard let category = selectedCategory else { return [] }
        return ActionCatalog.runtimeDefinitions(settings: settings)
            .filter { ActionAvailabilityEvaluator.resolvedCategory(for: $0, settings: settings) == category }
            .sorted { ActionAvailabilityEvaluator.resolvedOrder(for: $0, settings: settings) < ActionAvailabilityEvaluator.resolvedOrder(for: $1, settings: settings) }
    }

    private var selectedActionDefinition: ActionDefinition? {
        let row = actionTable.selectedRow
        let actions = actionsForSelectedCategory
        guard row >= 0, row < actions.count else { return actions.first }
        return actions[row]
    }

    private var selectedToolKind: ToolKind? {
        let row = toolTable.selectedRow
        guard row >= 0, row < ToolKind.allCases.count else { return ToolKind.allCases.first }
        return ToolKind.allCases[row]
    }

    init() {
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1120, height: 760), styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
        window.title = "U-Right Settings"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.toolbarStyle = .unified
        window.isMovableByWindowBackground = true
        super.init(window: window)
        configure()
        loadValues()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    private func configure() {
        detectedTools = ToolDetector.shared.detect(settings: settings)

        defaultTerminal.addItems(withTitles: ["terminal", "ghostty", "iTerm"])
        defaultEditor.addItems(withTitles: ["vscode", "cursor", "zed"])
        preferredProvider.addItems(withTitles: AIProvider.allCases.map(\.rawValue))
        categoryDisplayStyle.addItems(withTitles: MenuCategoryDisplayStyle.allCases.map(\.rawValue))
        actionCategoryPopup.addItems(withTitles: ActionCatalog.categoryDefinitions.map(\.category.rawValue))
        previewSelector.target = self
        previewSelector.action = #selector(changePreviewContext)
        previewSelector.selectedSegment = 0

        categoryEnabledCheckbox.target = self
        categoryEnabledCheckbox.action = #selector(toggleSelectedCategory)
        categoryDisplayStyle.target = self
        categoryDisplayStyle.action = #selector(changeCategoryDisplayStyle)
        actionEnabledCheckbox.target = self
        actionEnabledCheckbox.action = #selector(toggleSelectedAction)
        actionCategoryPopup.target = self
        actionCategoryPopup.action = #selector(changeSelectedActionCategory)
        toolAllowActions.target = self
        toolAllowActions.action = #selector(toggleToolMenuActions)
        toolCustomPath.target = self
        toolCustomPath.action = #selector(updateToolCustomPath)
        showUnavailableInPreview.target = self
        showUnavailableInPreview.action = #selector(updatePreviewFlags)
        collapseSingleGroups.target = self
        collapseSingleGroups.action = #selector(updatePreviewFlags)

        sectionViews = [
            .general: generalView(),
            .contextMenu: contextMenuView(),
            .integrations: integrationsView(),
            .ai: aiView(),
            .templates: templatesView(),
            .customActions: customActionsView(),
            .advanced: advancedView()
        ]

        let headerTitle = NSTextField(labelWithString: "U-Right Settings")
        headerTitle.font = .systemFont(ofSize: 24, weight: .semibold)
        let headerSubtitle = NSTextField(labelWithString: "Configure Finder menus, tools, AI behavior, and templates.")
        headerSubtitle.textColor = .secondaryLabelColor
        let header = NSStackView(views: [headerTitle, headerSubtitle])
        header.orientation = .vertical
        header.spacing = 4
        header.edgeInsets = NSEdgeInsets(top: 8, left: 12, bottom: 0, right: 12)

        let sidebar = sidebarView()
        let split = NSSplitView()
        split.isVertical = true
        split.dividerStyle = .thin
        split.translatesAutoresizingMaskIntoConstraints = false
        split.addArrangedSubview(sidebar)
        split.addArrangedSubview(contentContainer)
        sidebar.widthAnchor.constraint(equalToConstant: 220).isActive = true
        contentContainer.translatesAutoresizingMaskIntoConstraints = false
        contentContainer.wantsLayer = true
        contentContainer.layer?.cornerRadius = 18
        contentContainer.layer?.borderWidth = 1
        contentContainer.layer?.borderColor = NSColor.separatorColor.withAlphaComponent(0.6).cgColor
        contentContainer.layer?.backgroundColor = NSColor.windowBackgroundColor.withAlphaComponent(0.92).cgColor
        render(section: currentSection)

        let save = NSButton(title: "Save", target: self, action: #selector(saveSettings))
        save.bezelStyle = .rounded
        let reset = NSButton(title: "Reset", target: self, action: #selector(resetSettings))
        reset.bezelStyle = .rounded
        let revealLogs = NSButton(title: "Reveal Logs", target: self, action: #selector(revealLogsAction))
        revealLogs.bezelStyle = .rounded
        let buttons = NSStackView(views: [save, reset, revealLogs])
        buttons.orientation = .horizontal
        buttons.spacing = 8
        buttons.edgeInsets = NSEdgeInsets(top: 8, left: 12, bottom: 12, right: 12)

        let root = NSStackView(views: [header, split, buttons])
        root.orientation = .vertical
        root.spacing = 12
        root.translatesAutoresizingMaskIntoConstraints = false

        let content = NSVisualEffectView()
        content.material = .underWindowBackground
        content.blendingMode = .behindWindow
        content.state = .active
        content.addSubview(root)
        NSLayoutConstraint.activate([
            root.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 14),
            root.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -14),
            root.topAnchor.constraint(equalTo: content.topAnchor, constant: 14),
            root.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -14)
        ])
        window?.contentView = content
    }

    private func sidebarView() -> NSView {
        let stack = NSStackView()
        stack.orientation = .vertical
        stack.spacing = 8
        stack.edgeInsets = NSEdgeInsets(top: 12, left: 10, bottom: 12, right: 10)

        for section in Section.allCases {
            let button = NSButton(title: section.title, target: self, action: #selector(changeSection(_:)))
            button.identifier = NSUserInterfaceItemIdentifier(section.title)
            button.image = NSImage(systemSymbolName: section.symbolName, accessibilityDescription: section.title)
            button.imagePosition = .imageLeading
            button.bezelStyle = .recessed
            button.setButtonType(.momentaryPushIn)
            button.contentTintColor = .labelColor
            button.alignment = .left
            button.font = .systemFont(ofSize: 13, weight: .medium)
            sectionButtons[section] = button
            stack.addArrangedSubview(button)
        }

        let visual = NSVisualEffectView()
        visual.material = .sidebar
        visual.blendingMode = .withinWindow
        visual.state = .active
        visual.wantsLayer = true
        visual.layer?.cornerRadius = 18
        visual.translatesAutoresizingMaskIntoConstraints = false
        stack.translatesAutoresizingMaskIntoConstraints = false
        visual.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: visual.leadingAnchor, constant: 8),
            stack.trailingAnchor.constraint(equalTo: visual.trailingAnchor, constant: -8),
            stack.topAnchor.constraint(equalTo: visual.topAnchor, constant: 12),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: visual.bottomAnchor, constant: -12)
        ])
        updateSectionButtonStates()
        return visual
    }

    @objc private func changeSection(_ sender: NSButton) {
        guard let entry = sectionButtons.first(where: { $0.value == sender }) else { return }
        currentSection = entry.key
        render(section: currentSection)
    }

    private func render(section: Section) {
        contentContainer.subviews.forEach { $0.removeFromSuperview() }
        guard let view = sectionViews[section] else { return }
        view.translatesAutoresizingMaskIntoConstraints = false
        contentContainer.addSubview(view)
        NSLayoutConstraint.activate([
            view.leadingAnchor.constraint(equalTo: contentContainer.leadingAnchor),
            view.trailingAnchor.constraint(equalTo: contentContainer.trailingAnchor),
            view.topAnchor.constraint(equalTo: contentContainer.topAnchor),
            view.bottomAnchor.constraint(equalTo: contentContainer.bottomAnchor)
        ])
        updateSectionButtonStates()
    }

    private func updateSectionButtonStates() {
        for (section, button) in sectionButtons {
            if section == currentSection {
                button.contentTintColor = .white
                button.hasDestructiveAction = false
                button.bezelColor = .controlAccentColor
            } else {
                button.contentTintColor = .labelColor
                button.bezelColor = nil
            }
        }
    }

    private func generalView() -> NSView {
        form([
            launchAtLogin,
            showMenuBarIcon,
            showExtensionStatus
        ])
    }

    private func contextMenuView() -> NSView {
        configureTable(categoryTable, tag: .categories, title: "Categories")
        configureTable(actionTable, tag: .actions, title: "Actions")
        previewTextView.isEditable = false
        previewTextView.font = .monospacedSystemFont(ofSize: 12, weight: .regular)

        let categoryControls = NSStackView(views: [
            categoryEnabledCheckbox,
            labeled("Display style", categoryDisplayStyle),
            horizontalButtons(
                ("Move Up", #selector(moveCategoryUp)),
                ("Move Down", #selector(moveCategoryDown))
            )
        ])
        categoryControls.orientation = .vertical
        categoryControls.spacing = 8

        let actionControls = NSStackView(views: [
            actionEnabledCheckbox,
            labeled("Category", actionCategoryPopup),
            actionDetailsLabel,
            horizontalButtons(
                ("Move Up", #selector(moveActionUp)),
                ("Move Down", #selector(moveActionDown))
            )
        ])
        actionControls.orientation = .vertical
        actionControls.spacing = 8

        let previewControls = NSStackView(views: [previewSelector, showUnavailableInPreview, collapseSingleGroups])
        previewControls.orientation = .vertical
        previewControls.spacing = 8

        let categoryPane = pane(title: "Categories", body: [tableScrollView(categoryTable), categoryControls])
        let actionPane = pane(title: "Actions", body: [tableScrollView(actionTable), actionControls])
        let previewPane = pane(title: "Preview", body: [previewControls, scrollTextView(previewTextView)])

        let split = NSSplitView()
        split.dividerStyle = .thin
        split.translatesAutoresizingMaskIntoConstraints = false
        split.isVertical = true
        [categoryPane, actionPane, previewPane].forEach { view in
            split.addArrangedSubview(view)
        }
        return wrapFill(split)
    }

    private func integrationsView() -> NSView {
        configureTable(toolTable, tag: .tools, title: "Tools")
        let details = NSStackView(views: [
            labeled("Default terminal", defaultTerminal),
            labeled("Default editor", defaultEditor),
            toolStatusLabel,
            toolAllowActions,
            labeled("Custom path", toolCustomPath),
            horizontalButtons(
                ("Reload Detection", #selector(reloadTools)),
                ("Test Tool", #selector(testSelectedTool))
            )
        ])
        details.orientation = .vertical
        details.spacing = 8
        let rawPathsScroll = NSScrollView(frame: NSRect(x: 0, y: 0, width: 560, height: 180))
        customPaths.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        rawPathsScroll.documentView = customPaths
        rawPathsScroll.hasVerticalScroller = true
        let split = NSSplitView()
        split.dividerStyle = .thin
        split.translatesAutoresizingMaskIntoConstraints = false
        split.isVertical = true
        split.addArrangedSubview(pane(title: "Tool List", body: [tableScrollView(toolTable)]))
        split.addArrangedSubview(pane(title: "Details", body: [details, labeled("Raw executable path overrides", rawPathsScroll)]))
        return wrapFill(split)
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
            labeled("Visible AI actions (comma separated IDs)", aiActionsField),
            NSButton(title: "Test Connection", target: self, action: #selector(testConnection))
        ])
    }

    private func templatesView() -> NSView {
        templateSummaryView.isEditable = false
        templateSummaryView.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        return form([
            labeled("Custom template folder", templateFolder),
            labeled("Active runtime templates", scrollTextView(templateSummaryView)),
            NSButton(title: "Reload Templates", target: self, action: #selector(reloadTemplates))
        ])
    }

    private func customActionsView() -> NSView {
        customActionsSummaryView.isEditable = false
        customActionsSummaryView.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        return form([
            labeled("Custom open actions synced from settings", scrollTextView(customActionsSummaryView))
        ])
    }

    private func advancedView() -> NSView {
        return form([
            debugLogging
        ])
    }

    private func configureTable(_ table: NSTableView, tag: TableTag, title: String) {
        table.tag = tag.rawValue
        table.delegate = self
        table.dataSource = self
        table.headerView = nil
        let column = NSTableColumn(identifier: .init(title))
        column.title = title
        column.width = 280
        table.addTableColumn(column)
    }

    private func pane(title: String, body: [NSView]) -> NSView {
        let titleLabel = NSTextField(labelWithString: title)
        titleLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        let stack = NSStackView(views: [titleLabel] + body)
        stack.orientation = .vertical
        stack.spacing = 10
        stack.edgeInsets = NSEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        let container = NSView()
        container.wantsLayer = true
        container.layer?.cornerRadius = 14
        container.layer?.borderWidth = 1
        container.layer?.borderColor = NSColor.separatorColor.withAlphaComponent(0.6).cgColor
        container.layer?.backgroundColor = NSColor.controlBackgroundColor.withAlphaComponent(0.7).cgColor
        stack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
        return container
    }

    private func tableScrollView(_ table: NSTableView) -> NSScrollView {
        let scroll = NSScrollView()
        scroll.documentView = table
        scroll.hasVerticalScroller = true
        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 280).isActive = true
        return scroll
    }

    private func scrollTextView(_ textView: NSTextView) -> NSScrollView {
        let scroll = NSScrollView()
        scroll.documentView = textView
        scroll.hasVerticalScroller = true
        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 280).isActive = true
        return scroll
    }

    private func horizontalButtons(_ items: (String, Selector)...) -> NSView {
        let views = items.map { item -> NSButton in
            let button = NSButton(title: item.0, target: self, action: item.1)
            return button
        }
        let stack = NSStackView(views: views)
        stack.orientation = .horizontal
        stack.spacing = 8
        return stack
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
        return wrapFill(stack)
    }

    private func wrapFill(_ view: NSView) -> NSView {
        let container = NSView()
        view.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(view)
        NSLayoutConstraint.activate([
            view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            view.topAnchor.constraint(equalTo: container.topAnchor),
            view.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
        return container
    }

    private func loadValues() {
        settings = SettingsStore.shared.load()
        detectedTools = ToolDetector.shared.detect(settings: settings)
        launchAtLogin.state = settings.general.launchAtLogin ? .on : .off
        showMenuBarIcon.state = settings.general.showMenuBarIcon ? .on : .off
        showExtensionStatus.state = settings.general.showExtensionStatus ? .on : .off
        aiEnabled.state = settings.ai.enabled ? .on : .off
        includeHidden.state = activePromptPolicy().includeHiddenFiles ? .on : .off
        debugLogging.state = settings.advanced.debugLogging ? .on : .off
        defaultTerminal.selectItem(withTitle: settings.integrations.defaultTerminal.rawValue)
        defaultEditor.selectItem(withTitle: settings.integrations.defaultEditor.rawValue)
        preferredProvider.selectItem(withTitle: settings.ai.preferredProvider.rawValue)
        apiBaseURL.stringValue = activeAIProfile().apiBaseURL
        apiKey.stringValue = activeAIProfile().apiKey
        apiModel.stringValue = activeAIProfile().apiModel
        systemPrompt.stringValue = activePromptPolicy().systemPromptTemplate
        maxFileSize.stringValue = String(activePromptPolicy().maxContextFileSize)
        maxDepth.stringValue = String(activePromptPolicy().maxFolderScanDepth)
        templateFolder.stringValue = settings.templates.customTemplateFolder
        customPaths.string = settings.integrations.customExecutablePaths.map { "\($0.key)=\($0.value)" }.sorted().joined(separator: "\n")
        aiActionsField.stringValue = settings.ai.actionVisibility.joined(separator: ", ")
        templateSummaryView.string = runtimeTemplateSummary()
        customActionsSummaryView.string = customOpenActionsSummary()
        showUnavailableInPreview.state = settings.contextMenu.showUnavailableInPreview ? .on : .off
        collapseSingleGroups.state = settings.contextMenu.collapseSingleActionGroups ? .on : .off
        categoryTable.reloadData()
        actionTable.reloadData()
        toolTable.reloadData()
        categoryTable.selectRowIndexes(IndexSet(integer: 0), byExtendingSelection: false)
        actionTable.selectRowIndexes(IndexSet(integer: 0), byExtendingSelection: false)
        toolTable.selectRowIndexes(IndexSet(integer: 0), byExtendingSelection: false)
        refreshCategoryControls()
        refreshActionControls()
        refreshToolControls()
        refreshPreview()
    }

    @objc private func saveSettings() {
        settings.general.launchAtLogin = launchAtLogin.state == .on
        settings.general.showMenuBarIcon = showMenuBarIcon.state == .on
        settings.general.showExtensionStatus = showExtensionStatus.state == .on
        settings.ai.enabled = aiEnabled.state == .on
        settings.advanced.debugLogging = debugLogging.state == .on
        settings.integrations.defaultTerminal = ToolKind(rawValue: defaultTerminal.titleOfSelectedItem ?? "terminal") ?? .terminal
        settings.integrations.defaultEditor = ToolKind(rawValue: defaultEditor.titleOfSelectedItem ?? "vscode") ?? .vscode
        settings.ai.preferredProvider = AIProvider(rawValue: preferredProvider.titleOfSelectedItem ?? "auto") ?? .auto
        let profileIndex = ensureActiveAIProfile()
        settings.ai.profiles[profileIndex].apiBaseURL = apiBaseURL.stringValue
        settings.ai.profiles[profileIndex].apiKey = apiKey.stringValue
        settings.ai.profiles[profileIndex].apiModel = apiModel.stringValue
        settings.ai.profiles[profileIndex].isEnabled = true
        let policyIndex = ensureActivePromptPolicy()
        settings.ai.promptPolicies[policyIndex].systemPromptTemplate = systemPrompt.stringValue
        settings.ai.promptPolicies[policyIndex].maxContextFileSize = Int(maxFileSize.stringValue) ?? 64_000
        settings.ai.promptPolicies[policyIndex].maxFolderScanDepth = Int(maxDepth.stringValue) ?? 3
        settings.ai.promptPolicies[policyIndex].includeHiddenFiles = includeHidden.state == .on
        settings.templates.customTemplateFolder = templateFolder.stringValue
        settings.contextMenu.showUnavailableInPreview = showUnavailableInPreview.state == .on
        settings.contextMenu.collapseSingleActionGroups = collapseSingleGroups.state == .on
        settings.ai.actionVisibility = aiActionsField.stringValue
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        settings.integrations.customExecutablePaths = Dictionary(uniqueKeysWithValues: customPaths.string.split(separator: "\n").compactMap {
            let parts = $0.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { return nil }
            return (parts[0], parts[1])
        })
        for preference in settings.integrations.toolPreferences where !preference.customPath.isEmpty {
            settings.integrations.customExecutablePaths[preference.kind.rawValue] = preference.customPath
        }
        settings.normalizeDerivedSettings()
        SettingsStore.shared.save(settings)
        detectedTools = ToolDetector.shared.detect(settings: settings)
        refreshPreview()
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
        let profile = activeAIProfile()
        let policy = activePromptPolicy()
        let message = [
            "Claude CLI: \(detector[.claude]?.isInstalled == true ? "Yes" : "No")",
            "Codex CLI: \(detector[.codex]?.isInstalled == true ? "Yes" : "No")",
            "Provider: \(settings.ai.preferredProvider.rawValue)",
            "Profile: \(profile.name)",
            "Policy: \(policy.name)",
            "API Base: \(profile.apiBaseURL)"
        ].joined(separator: "\n")
        PromptPanelController.showInfo(title: "AI Status", message: message)
    }

    @objc private func changePreviewContext() {
        previewSelectionKind = switch previewSelector.selectedSegment {
        case 1: .folder
        case 2: .multi
        case 3: .empty
        default: .file
        }
        refreshPreview()
    }

    @objc private func toggleSelectedCategory() {
        guard let category = selectedCategory, let index = settings.contextMenu.categorySettings.firstIndex(where: { $0.category == category }) else { return }
        settings.contextMenu.categorySettings[index].isEnabled = categoryEnabledCheckbox.state == .on
        categoryTable.reloadData()
        actionTable.reloadData()
        refreshPreview()
    }

    @objc private func changeCategoryDisplayStyle() {
        guard let category = selectedCategory, let index = settings.contextMenu.categorySettings.firstIndex(where: { $0.category == category }) else { return }
        settings.contextMenu.categorySettings[index].displayStyle = MenuCategoryDisplayStyle(rawValue: categoryDisplayStyle.titleOfSelectedItem ?? "submenu") ?? .submenu
        refreshPreview()
    }

    @objc private func moveCategoryUp() { moveCategory(delta: -1) }
    @objc private func moveCategoryDown() { moveCategory(delta: 1) }

    private func moveCategory(delta: Int) {
        guard let category = selectedCategory,
              let index = settings.contextMenu.categorySettings.firstIndex(where: { $0.category == category }) else { return }
        let newOrder = settings.contextMenu.categorySettings[index].order + delta
        if let swapIndex = settings.contextMenu.categorySettings.firstIndex(where: { $0.order == newOrder }) {
            settings.contextMenu.categorySettings[swapIndex].order -= delta
            settings.contextMenu.categorySettings[index].order = newOrder
            categoryTable.reloadData()
            refreshPreview()
        }
    }

    @objc private func toggleSelectedAction() {
        guard let definition = selectedActionDefinition else { return }
        upsertActionSetting(actionID: definition.id) { $0.isEnabled = actionEnabledCheckbox.state == .on }
        actionTable.reloadData()
        refreshPreview()
    }

    @objc private func changeSelectedActionCategory() {
        guard let definition = selectedActionDefinition else { return }
        let category = ActionCategory(rawValue: actionCategoryPopup.titleOfSelectedItem ?? definition.defaultCategory.rawValue)
        upsertActionSetting(actionID: definition.id) { $0.categoryOverride = category }
        actionTable.reloadData()
        refreshActionControls()
        refreshPreview()
    }

    @objc private func moveActionUp() { moveAction(delta: -10) }
    @objc private func moveActionDown() { moveAction(delta: 10) }

    private func moveAction(delta: Int) {
        guard let definition = selectedActionDefinition else { return }
        upsertActionSetting(actionID: definition.id) { setting in
            let current = setting.orderOverride ?? definition.defaultOrder
            setting.orderOverride = current + delta
        }
        actionTable.reloadData()
        refreshPreview()
    }

    @objc private func updatePreviewFlags() {
        settings.contextMenu.showUnavailableInPreview = showUnavailableInPreview.state == .on
        settings.contextMenu.collapseSingleActionGroups = collapseSingleGroups.state == .on
        refreshPreview()
    }

    @objc private func reloadTools() {
        detectedTools = ToolDetector.shared.detect(settings: settings)
        toolTable.reloadData()
        refreshToolControls()
        refreshPreview()
    }

    @objc private func testSelectedTool() {
        guard let tool = selectedToolKind else { return }
        let availability = detectedTools[tool]
        let message = [
            "Tool: \(tool.rawValue)",
            "Installed: \(availability?.isInstalled == true ? "Yes" : "No")",
            "Executable: \(availability?.executablePath ?? "-")",
            "App: \(availability?.appPath ?? "-")"
        ].joined(separator: "\n")
        PromptPanelController.showInfo(title: "Tool Status", message: message)
    }

    @objc private func toggleToolMenuActions() {
        guard let tool = selectedToolKind, let index = settings.integrations.toolPreferences.firstIndex(where: { $0.kind == tool }) else { return }
        settings.integrations.toolPreferences[index].allowMenuActions = toolAllowActions.state == .on
        settings.normalizeDerivedSettings()
        refreshPreview()
    }

    @objc private func updateToolCustomPath() {
        guard let tool = selectedToolKind, let index = settings.integrations.toolPreferences.firstIndex(where: { $0.kind == tool }) else { return }
        settings.integrations.toolPreferences[index].customPath = toolCustomPath.stringValue
        settings.integrations.customExecutablePaths[tool.rawValue] = toolCustomPath.stringValue
        settings.normalizeDerivedSettings()
        detectedTools = ToolDetector.shared.detect(settings: settings)
        toolTable.reloadData()
        refreshToolControls()
        refreshPreview()
    }

    private func upsertActionSetting(actionID: String, update: (inout MenuActionSettings) -> Void) {
        if let index = settings.contextMenu.actionSettings.firstIndex(where: { $0.actionID == actionID }) {
            update(&settings.contextMenu.actionSettings[index])
        } else {
            var item = MenuActionSettings(actionID: actionID)
            update(&item)
            settings.contextMenu.actionSettings.append(item)
        }
    }

    private func previewContext() -> FinderActionContext {
        let base = URL(fileURLWithPath: "/Users/demo/Project")
        let file = base.appendingPathComponent("main.swift")
        let folder = base.appendingPathComponent("Sources", isDirectory: true)
        let selectedURLs: [URL]
        let primaryURL: URL?
        let currentDirectoryURL: URL?

        switch previewSelectionKind {
        case .file:
            selectedURLs = [file]
            primaryURL = file
            currentDirectoryURL = base
        case .folder:
            selectedURLs = [folder]
            primaryURL = folder
            currentDirectoryURL = base
        case .multi:
            selectedURLs = [file, base.appendingPathComponent("README.md")]
            primaryURL = file
            currentDirectoryURL = base
        case .empty:
            selectedURLs = []
            primaryURL = nil
            currentDirectoryURL = base
        case .mixed:
            selectedURLs = [file, folder]
            primaryURL = file
            currentDirectoryURL = base
        }

        let metadata = selectedURLs.map(FileSystemHelper.metadata)
        return FinderActionContext(
            selectedURLs: selectedURLs,
            primaryURL: primaryURL,
            currentDirectoryURL: currentDirectoryURL,
            selectionKind: previewSelectionKind,
            detectedTools: detectedTools,
            fileMetadata: metadata,
            extensionWindowTitle: "Settings Preview"
        )
    }

    private func refreshPreview() {
        let lines = ActionMenuBuilder.previewLines(context: previewContext(), settings: settings)
        previewTextView.string = lines.isEmpty ? "No actions available." : lines.joined(separator: "\n")
    }

    private func refreshCategoryControls() {
        guard let category = selectedCategory,
              let item = settings.contextMenu.categorySettings.first(where: { $0.category == category }) else { return }
        categoryEnabledCheckbox.state = item.isEnabled ? .on : .off
        categoryDisplayStyle.selectItem(withTitle: item.displayStyle.rawValue)
    }

    private func refreshActionControls() {
        guard let definition = selectedActionDefinition else {
            actionDetailsLabel.stringValue = "选择动作查看详情"
            return
        }
        let setting = settings.contextMenu.actionSettings.first { $0.actionID == definition.id }
        actionEnabledCheckbox.state = (setting?.isEnabled ?? definition.defaultVisible) ? .on : .off
        actionCategoryPopup.selectItem(withTitle: (setting?.categoryOverride ?? definition.defaultCategory).rawValue)
        let requirements = [
            definition.implementationStatus.rawValue,
            definition.requirements.requiredTool?.rawValue,
            definition.requirements.requiresAI ? "AI" : nil,
            definition.requirements.isDestructive ? "destructive" : nil
        ].compactMap { $0 }
        actionDetailsLabel.stringValue = "ID: \(definition.id)\nRequirements: \(requirements.joined(separator: ", "))"
    }

    private func refreshToolControls() {
        guard let tool = selectedToolKind,
              let preference = settings.integrations.toolPreferences.first(where: { $0.kind == tool }) else { return }
        let availability = detectedTools[tool]
        toolAllowActions.state = preference.allowMenuActions ? .on : .off
        toolCustomPath.stringValue = preference.customPath
        toolStatusLabel.stringValue = """
        Tool: \(tool.rawValue)
        Installed: \(availability?.isInstalled == true ? "Yes" : "No")
        Executable: \(availability?.executablePath ?? "-")
        App: \(availability?.appPath ?? "-")
        """
    }

    private func activeAIProfile() -> AIProfile {
        if let profile = settings.ai.profiles.first(where: { $0.id == settings.ai.defaultProfileID && $0.isEnabled }) {
            return profile
        }
        if let profile = settings.ai.profiles.first(where: \.isEnabled) {
            return profile
        }
        return settings.ai.profiles.first ?? AIProfile(id: "native-default-openai-compatible", name: "Default OpenAI-Compatible", provider: .openAICompatible, apiBaseURL: "https://api.openai.com/v1", apiKey: "", apiModel: "gpt-4.1-mini", isEnabled: true)
    }

    private func activePromptPolicy() -> PromptPolicy {
        if let policy = settings.ai.promptPolicies.first(where: { $0.id == settings.ai.defaultPromptPolicyID }) {
            return policy
        }
        return settings.ai.promptPolicies.first ?? PromptPolicy(id: "native-default-policy", name: "Default Policy", systemPromptTemplate: "You are a precise macOS power-user assistant.", maxContextFileSize: 64_000, maxFolderScanDepth: 3, includeHiddenFiles: false)
    }

    private func ensureActiveAIProfile() -> Int {
        if let index = settings.ai.profiles.firstIndex(where: { $0.id == settings.ai.defaultProfileID }) {
            return index
        }
        if let index = settings.ai.profiles.firstIndex(where: \.isEnabled) {
            settings.ai.defaultProfileID = settings.ai.profiles[index].id
            return index
        }
        let profile = AIProfile(id: "native-default-openai-compatible", name: "Default OpenAI-Compatible", provider: .openAICompatible, apiBaseURL: "https://api.openai.com/v1", apiKey: "", apiModel: "gpt-4.1-mini", isEnabled: true)
        settings.ai.profiles = [profile]
        settings.ai.defaultProfileID = profile.id
        return 0
    }

    private func ensureActivePromptPolicy() -> Int {
        if let index = settings.ai.promptPolicies.firstIndex(where: { $0.id == settings.ai.defaultPromptPolicyID }) {
            return index
        }
        if !settings.ai.promptPolicies.isEmpty {
            settings.ai.defaultPromptPolicyID = settings.ai.promptPolicies[0].id
            return 0
        }
        let policy = PromptPolicy(id: "native-default-policy", name: "Default Policy", systemPromptTemplate: "You are a precise macOS power-user assistant.", maxContextFileSize: 64_000, maxFolderScanDepth: 3, includeHiddenFiles: false)
        settings.ai.promptPolicies = [policy]
        settings.ai.defaultPromptPolicyID = policy.id
        return 0
    }

    private func runtimeTemplateSummary() -> String {
        let templates = RuntimeTemplates.all(settings: settings)
        guard !templates.isEmpty else { return "No templates available." }
        return templates.map { template in
            let ext = template.fileExtension.isEmpty ? "-" : template.fileExtension
            let executable = template.makeExecutable ? " executable" : ""
            return "\(template.id) · \(template.title) · .\(ext)\(executable)"
        }.joined(separator: "\n")
    }

    private func customOpenActionsSummary() -> String {
        let actions = settings.customActions.openActions.sorted { $0.sortOrder < $1.sortOrder }
        guard !actions.isEmpty else { return "No custom open actions configured." }
        return actions.map { action in
            let status = action.isEnabled ? "enabled" : "disabled"
            return "\(action.name) · \(action.targetKind) · \(action.category.rawValue) · \(status)\n\(action.appPath)"
        }.joined(separator: "\n\n")
    }

    func numberOfRows(in tableView: NSTableView) -> Int {
        switch TableTag(rawValue: tableView.tag) {
        case .categories:
            return orderedCategories.count
        case .actions:
            return actionsForSelectedCategory.count
        case .tools:
            return ToolKind.allCases.count
        case nil:
            return 0
        }
    }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        let text = NSTextField(labelWithString: "")
        text.lineBreakMode = .byTruncatingMiddle
        switch TableTag(rawValue: tableView.tag) {
        case .categories:
            let category = orderedCategories[row]
            let setting = settings.contextMenu.categorySettings.first { $0.category == category }
            text.stringValue = "\(setting?.isEnabled == true ? "✓" : "✗")  \(category.rawValue)  [\(setting?.displayStyle.rawValue ?? "submenu")]"
        case .actions:
            let definition = actionsForSelectedCategory[row]
            let actionSetting = settings.contextMenu.actionSettings.first { $0.actionID == definition.id }
            text.stringValue = "\(actionSetting?.isEnabled ?? definition.defaultVisible ? "✓" : "✗")  \(definition.title)  [\(definition.implementationStatus.rawValue)]"
        case .tools:
            let tool = ToolKind.allCases[row]
            text.stringValue = "\(detectedTools[tool]?.isInstalled == true ? "✓" : "✗")  \(tool.rawValue)"
        case nil:
            break
        }
        return text
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        guard let table = notification.object as? NSTableView else { return }
        switch TableTag(rawValue: table.tag) {
        case .categories:
            actionTable.reloadData()
            if actionTable.numberOfRows > 0 {
                actionTable.selectRowIndexes(IndexSet(integer: 0), byExtendingSelection: false)
            }
            refreshCategoryControls()
            refreshActionControls()
        case .actions:
            refreshActionControls()
        case .tools:
            refreshToolControls()
        case nil:
            break
        }
    }
}
