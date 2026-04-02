import AppKit
import FinderSync
import Foundation
import URightShared

public final class FinderSyncExtension: FIFinderSync {
    private let controller = FIFinderSyncController.default()
    private var currentContextsByActionID: [String: FinderActionContext] = [:]
    private var currentActionIDsByMenuTitle: [String: String] = [:]

    private func leafActionLabels(for descriptors: [ActionDescriptor]) -> [String] {
        descriptors.flatMap { descriptor in
            if descriptor.children.isEmpty {
                return [descriptor.title]
            }
            return leafActionLabels(for: descriptor.children)
        }
    }

    public override init() {
        super.init()
        controller.directoryURLs = [URL(fileURLWithPath: "/")]
        Logger.shared.info("extension", "Finder Sync extension initialized appGroup=\(URightConstants.appGroupIdentifier) sharedRoot=\(SharedPaths.appGroupContainerURL().path)")
    }

    public override func menu(for menuKind: FIMenuKind) -> NSMenu {
        let context = currentContext(menuKind: menuKind)
        let settings = SettingsStore.shared.load()
        let descriptors = ActionRegistry.topLevelActions(context: context, settings: settings)
        currentContextsByActionID = [:]
        currentActionIDsByMenuTitle = [:]
        let actionLabels = leafActionLabels(for: descriptors).joined(separator: " | ")
        Logger.shared.info(
            "extension",
            "Build menu kind=\(menuKind.rawValue) selectionKind=\(context.selectionKind.rawValue) selectedCount=\(context.selectedURLs.count) primary=\(context.primaryURL?.path ?? "-") currentDir=\(context.currentDirectoryURL?.path ?? "-") actions=\(actionLabels)"
        )
        let menu = NSMenu(title: "U-Right")
        descriptors.forEach { descriptor in
            if let item = menuItem(for: descriptor, context: context) {
                menu.addItem(item)
            }
        }
        return menu
    }

    public override var toolbarItemName: String { "U-Right" }
    public override var toolbarItemToolTip: String { "U-Right Super Right Click" }
    public override var toolbarItemImage: NSImage { NSImage(systemSymbolName: "cursorarrow.click.2", accessibilityDescription: nil) ?? NSImage() }

    private func menuItem(for descriptor: ActionDescriptor, context: FinderActionContext) -> NSMenuItem? {
        if !descriptor.children.isEmpty {
            let parent = NSMenuItem(title: descriptor.title, action: nil, keyEquivalent: "")
            parent.image = NSImage(systemSymbolName: descriptor.systemImageName, accessibilityDescription: descriptor.title)
            let submenu = NSMenu(title: descriptor.title)
            descriptor.children.forEach { child in
                if let item = menuItem(for: child, context: context) {
                    submenu.addItem(item)
                }
            }
            guard !submenu.items.isEmpty else { return nil }
            parent.submenu = submenu
            return parent
        }

        let item = NSMenuItem(title: badgeTitle(for: descriptor), action: #selector(runAction(_:)), keyEquivalent: "")
        item.target = self
        item.image = NSImage(systemSymbolName: descriptor.systemImageName, accessibilityDescription: descriptor.title)
        item.identifier = NSUserInterfaceItemIdentifier(descriptor.id)
        item.toolTip = descriptor.id
        item.isEnabled = descriptor.isEnabled
        currentContextsByActionID[descriptor.id] = context
        currentActionIDsByMenuTitle[item.title] = descriptor.id
        return item
    }

    private func badgeTitle(for descriptor: ActionDescriptor) -> String {
        if let badge = descriptor.statusBadge {
            return "\(descriptor.title)  [\(badge)]"
        }
        return descriptor.title
    }

    @objc public func runAction(_ sender: NSMenuItem) {
        let actionID = sender.toolTip ?? currentActionIDsByMenuTitle[sender.title] ?? sender.identifier?.rawValue ?? sender.title
        Logger.shared.info("extension", "runAction entered action=\(actionID) actionTitle=\(ActionCatalog.title(for: actionID)) menuTitle=\(sender.title)")
        guard let context = currentContextsByActionID[actionID] else {
            Logger.shared.error("extension", "Missing cached context for action=\(actionID) actionTitle=\(ActionCatalog.title(for: actionID))")
            return
        }
        let request = ActionRequest(actionID: actionID, context: context)
        do {
            _ = try ActionHandoff.saveRequest(request)
            Logger.shared.info(
                "extension",
                "Action clicked requestID=\(request.id.uuidString) action=\(request.actionID) actionTitle=\(ActionCatalog.title(for: request.actionID)) selectionKind=\(request.context.selectionKind.rawValue) selectedCount=\(request.context.selectedURLs.count) primary=\(request.context.primaryURL?.path ?? "-") currentDir=\(request.context.currentDirectoryURL?.path ?? "-")"
            )
            wakeHostApp()
        } catch {
            Logger.shared.error("extension", error.localizedDescription)
        }
    }

    private func wakeHostApp() {
        if SharedPaths.hasActiveDevHost() {
            Logger.shared.info("extension", "Skipping host wake because active dev host marker is present")
            return
        }
        if let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: URightConstants.appBundleIdentifier) {
            let configuration = NSWorkspace.OpenConfiguration()
            configuration.activates = false
            NSWorkspace.shared.openApplication(at: url, configuration: configuration)
        }
    }

    private func currentContext(menuKind: FIMenuKind) -> FinderActionContext {
        let rawSelectedURLs = controller.selectedItemURLs() ?? []
        let targetedURL = controller.targetedURL()
        let selectedURLs: [URL]
        let primaryURL: URL?
        let currentDirectoryURL: URL?

        switch menuKind {
        case .contextualMenuForItems:
            if rawSelectedURLs.isEmpty, let targetedURL {
                selectedURLs = [targetedURL]
                primaryURL = targetedURL
            } else {
                selectedURLs = rawSelectedURLs
                primaryURL = rawSelectedURLs.first
            }
            if let first = primaryURL, !FileSystemHelper.metadata(for: first).isDirectory {
                currentDirectoryURL = first.deletingLastPathComponent()
            } else {
                currentDirectoryURL = primaryURL?.deletingLastPathComponent() ?? targetedURL
            }
        case .contextualMenuForContainer, .contextualMenuForSidebar, .toolbarItemMenu:
            selectedURLs = rawSelectedURLs
            primaryURL = rawSelectedURLs.first
            currentDirectoryURL = targetedURL
        @unknown default:
            selectedURLs = rawSelectedURLs
            primaryURL = rawSelectedURLs.first ?? targetedURL
            currentDirectoryURL = targetedURL
        }

        let selectionKind: SelectionKind
        if selectedURLs.count > 1 {
            selectionKind = .multi
        } else if let first = primaryURL {
            selectionKind = FileSystemHelper.metadata(for: first).isDirectory ? .folder : .file
        } else {
            selectionKind = .empty
        }

        let metadata = selectedURLs.map(FileSystemHelper.metadata)
        return FinderActionContext(
            selectedURLs: selectedURLs,
            primaryURL: primaryURL,
            currentDirectoryURL: currentDirectoryURL,
            selectionKind: selectionKind,
            detectedTools: ToolDetector.shared.detect(),
            fileMetadata: metadata,
            extensionWindowTitle: menuKind.rawValue.description
        )
    }
}
