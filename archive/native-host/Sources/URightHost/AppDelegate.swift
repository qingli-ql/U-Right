import AppKit
import Foundation
import URightShared

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let settingsController = SettingsWindowController()
    private let logController = LogWindowController()
    private let onboardingController = OnboardingWindowController()
    private let dispatcher = HostActionDispatcher()

    func applicationDidFinishLaunching(_ notification: Notification) {
        SharedPaths.writePreferredHostRuntime(.nativeApp)
        buildStatusItem()
        registerNotifications()
        installDefaultTemplatesIfNeeded()
        Logger.shared.info("host", "U-Right host launched appGroup=\(URightConstants.appGroupIdentifier) sharedRoot=\(SharedPaths.appGroupContainerURL().path)")
        consumePendingRequests(reason: "launch")
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        settingsController.showWindow(nil)
        return true
    }

    private func buildStatusItem() {
        if let button = statusItem.button {
            if let icon = ((NSApp.applicationIconImage?.copy() as? NSImage) ?? NSApp.applicationIconImage) {
                icon.size = NSSize(width: 18, height: 18)
                button.image = icon
                button.imagePosition = .imageOnly
            }
        }
        statusItem.menu = NSMenu(title: "U-Right")
        statusItem.menu?.items = [
            menuItem(title: "Settings", action: #selector(openSettings)),
            menuItem(title: "Logs", action: #selector(openLogs)),
            menuItem(title: "Onboarding", action: #selector(openOnboarding)),
            menuItem(title: "Enable Finder Extension", action: #selector(openExtensionSettings)),
            NSMenuItem.separator(),
            menuItem(title: "Quit U-Right", action: #selector(quitApp))
        ]
    }

    private func menuItem(title: String, action: Selector) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
        item.target = self
        return item
    }

    private func registerNotifications() {
        Logger.shared.info("host", "Registering distributed notification observer")
        DistributedNotificationCenter.default().addObserver(
            self,
            selector: #selector(handleActionRequest(_:)),
            name: URightConstants.handoffNotification,
            object: nil
        )
    }

    private func installDefaultTemplatesIfNeeded() {
        let directory = SharedPaths.builtInTemplatesDirectory()
        for template in BuiltInTemplates.all where template.id != "empty" {
            let filename = "\(template.id).template"
            let url = directory.appendingPathComponent(filename)
            if !FileManager.default.fileExists(atPath: url.path) {
                try? template.starterContent.data(using: .utf8)?.write(to: url)
            }
        }
    }

    @objc private func handleActionRequest(_ notification: Notification) {
        let requestID = notification.object as? String
        let userInfo = notification.userInfo
        Logger.shared.info("host", "Notification received: object=\(requestID ?? "-") hasPayload=\((userInfo?[ActionHandoff.payloadUserInfoKey] as? String) != nil)")
        guard let requestID,
              let request = ActionHandoff.loadRequest(id: requestID, userInfo: userInfo) else { return }
        Logger.shared.info("host", "Dispatching request from notification requestID=\(request.id.uuidString) action=\(request.actionID)")
        dispatcher.perform(request: request)
    }

    private func consumePendingRequests(reason: String) {
        let directory = SharedPaths.requestsDirectory()
        let urls = ((try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? [])
            .filter { $0.pathExtension == "json" }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }

        Logger.shared.info("host", "Pending request sweep reason=\(reason) count=\(urls.count)")
        for url in urls {
            consumeRequestFile(at: url, reason: reason)
        }
    }

    private func consumeRequestFile(at url: URL, reason: String) {
        do {
            let data = try Data(contentsOf: url)
            let request = try JSONDecoder().decode(ActionRequest.self, from: data)
            try? FileManager.default.removeItem(at: url)
            Logger.shared.info("host", "Dispatching pending request requestID=\(request.id.uuidString) action=\(request.actionID) reason=\(reason)")
            dispatcher.perform(request: request)
        } catch {
            Logger.shared.error("host", "Failed to consume request file \(url.lastPathComponent): \(error.localizedDescription)")
        }
    }

    @objc private func openSettings() {
        settingsController.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func openLogs() {
        logController.reload()
        logController.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func openOnboarding() {
        onboardingController.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func openExtensionSettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.ExtensionsPreferences") {
            NSWorkspace.shared.open(url)
        }
    }

    @objc private func quitApp() {
        NSApp.terminate(nil)
    }
}
