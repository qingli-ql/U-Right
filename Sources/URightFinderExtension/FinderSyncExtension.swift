import AppKit
import FinderSync
import Foundation
import URightShared

public final class FinderSyncExtension: FIFinderSync {
    private let controller = FIFinderSyncController.default()
    private var currentContextsByActionID: [String: FinderActionContext] = [:]

    public override init() {
        super.init()
        controller.directoryURLs = [URL(fileURLWithPath: "/")]
        Logger.shared.info("extension", "Finder Sync extension initialized appGroup=\(URightConstants.appGroupIdentifier) sharedRoot=\(SharedPaths.appGroupContainerURL().path)")
    }

    public override func menu(for menuKind: FIMenuKind) -> NSMenu {
        let context = FinderContextBuilder.build(
            menuKind: menuKind,
            selectedItemURLs: controller.selectedItemURLs() ?? [],
            targetedURL: controller.targetedURL()
        )
        let settings = SettingsStore.shared.load()
        let descriptors = ActionRegistry.topLevelActions(context: context, settings: settings)
        currentContextsByActionID = [:]
        let binding = FinderMenuBridge.buildMenu(
            descriptors: descriptors,
            context: context,
            target: self,
            action: #selector(runAction(_:))
        )
        currentContextsByActionID = binding.contextsByActionID
        let actionLabels = binding.leafActionLabels.joined(separator: " | ")
        Logger.shared.info(
            "extension",
            "Build menu kind=\(menuKind.rawValue) selectionKind=\(context.selectionKind.rawValue) selectedCount=\(context.selectedURLs.count) primary=\(context.primaryURL?.path ?? "-") currentDir=\(context.currentDirectoryURL?.path ?? "-") actions=\(actionLabels)"
        )
        FinderSnapshotWriter.persistMenuSnapshot(context: context, settings: settings, descriptors: descriptors)
        return binding.menu
    }

    public override var toolbarItemName: String { "U-Right" }
    public override var toolbarItemToolTip: String { "U-Right Super Right Click" }
    public override var toolbarItemImage: NSImage { NSImage(systemSymbolName: "cursorarrow.click.2", accessibilityDescription: nil) ?? NSImage() }

    @objc public func runAction(_ sender: NSMenuItem) {
        let actionID = FinderMenuBridge.actionID(for: sender)
        Logger.shared.info("extension", "runAction entered action=\(actionID) actionTitle=\(ActionCatalog.title(for: actionID)) menuTitle=\(sender.title)")
        guard let context = currentContextsByActionID[actionID] else {
            Logger.shared.error("extension", "Missing cached context for action=\(actionID) actionTitle=\(ActionCatalog.title(for: actionID))")
            return
        }
        do {
            try ActionRequestWriter.persist(actionID: actionID, context: context)
            HostWakeService.wakeVerifiedHostApplication()
        } catch {
            Logger.shared.error("extension", error.localizedDescription)
        }
    }
}
