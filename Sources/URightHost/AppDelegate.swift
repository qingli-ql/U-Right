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
        buildStatusItem()
        registerNotifications()
        installDefaultTemplatesIfNeeded()
        Logger.shared.info("host", "U-Right host launched")
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        settingsController.showWindow(nil)
        return true
    }

    private func buildStatusItem() {
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "cursorarrow.click.2", accessibilityDescription: "U-Right")
            button.imagePosition = .imageOnly
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
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(handleActionRequest(_:)), name: URightConstants.handoffNotification, object: nil)
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
        guard let requestID = notification.object as? String,
              let request = ActionHandoff.loadRequest(id: requestID) else { return }
        Logger.shared.info("host", "Received action \(request.actionID)")
        dispatcher.perform(request: request)
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
