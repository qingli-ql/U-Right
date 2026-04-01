import AppKit
import FinderSync
import Foundation
import URightShared

private final class ActionMenuInvocation: NSObject {
    let actionID: String
    let context: FinderActionContext

    init(actionID: String, context: FinderActionContext) {
        self.actionID = actionID
        self.context = context
    }
}

public final class FinderSyncExtension: FIFinderSync {
    private let controller = FIFinderSyncController.default()

    public override init() {
        super.init()
        controller.directoryURLs = [URL(fileURLWithPath: "/")]
        Logger.shared.info("extension", "Finder Sync extension initialized")
    }

    public override func menu(for menuKind: FIMenuKind) -> NSMenu {
        let context = currentContext(menuKind: menuKind)
        let settings = SettingsStore.shared.load()
        let menu = NSMenu(title: "U-Right")
        ActionRegistry.topLevelActions(context: context, settings: settings).forEach { descriptor in
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
        item.representedObject = ActionMenuInvocation(actionID: descriptor.id, context: context)
        item.isEnabled = descriptor.isEnabled
        return item
    }

    private func badgeTitle(for descriptor: ActionDescriptor) -> String {
        if let badge = descriptor.statusBadge {
            return "\(descriptor.title)  [\(badge)]"
        }
        return descriptor.title
    }

    @objc private func runAction(_ sender: NSMenuItem) {
        guard let invocation = sender.representedObject as? ActionMenuInvocation else { return }
        let request = ActionRequest(actionID: invocation.actionID, context: invocation.context)
        do {
            _ = try ActionHandoff.saveRequest(request)
            Logger.shared.info("extension", "Saved request \(request.actionID)")
            wakeHostApp()
        } catch {
            Logger.shared.error("extension", error.localizedDescription)
        }
    }

    private func wakeHostApp() {
        if let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: URightConstants.appBundleIdentifier) {
            let configuration = NSWorkspace.OpenConfiguration()
            configuration.activates = false
            NSWorkspace.shared.openApplication(at: url, configuration: configuration)
        }
    }

    private func currentContext(menuKind: FIMenuKind) -> FinderActionContext {
        let selectedURLs = controller.selectedItemURLs() ?? []
        let targetedURL = controller.targetedURL()
        let selectionKind: SelectionKind
        if selectedURLs.count > 1 {
            selectionKind = .multi
        } else if let first = selectedURLs.first {
            selectionKind = FileSystemHelper.metadata(for: first).isDirectory ? .folder : .file
        } else {
            selectionKind = .empty
        }
        let metadata = selectedURLs.map(FileSystemHelper.metadata)
        return FinderActionContext(
            selectedURLs: selectedURLs,
            primaryURL: selectedURLs.first,
            currentDirectoryURL: targetedURL,
            selectionKind: selectionKind,
            detectedTools: ToolDetector.shared.detect(),
            fileMetadata: metadata,
            extensionWindowTitle: menuKind.rawValue.description
        )
    }
}
