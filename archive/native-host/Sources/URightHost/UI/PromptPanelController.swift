import AppKit

@MainActor
final class PromptPanelController {
    static func promptForText(title: String, message: String, defaultValue: String = "") -> String? {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")

        let field = NSTextField(string: defaultValue)
        field.frame = NSRect(x: 0, y: 0, width: 320, height: 24)
        alert.accessoryView = field

        let response = alert.runModal()
        guard response == .alertFirstButtonReturn else { return nil }
        return field.stringValue
    }

    static func promptForMultilineText(title: String, message: String, defaultValue: String) -> String? {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.addButton(withTitle: "Send")
        alert.addButton(withTitle: "Cancel")

        let scroll = NSScrollView(frame: NSRect(x: 0, y: 0, width: 520, height: 240))
        let textView = NSTextView(frame: scroll.bounds)
        textView.isRichText = false
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        textView.string = defaultValue
        scroll.documentView = textView
        scroll.hasVerticalScroller = true
        alert.accessoryView = scroll

        let response = alert.runModal()
        guard response == .alertFirstButtonReturn else { return nil }
        return textView.string
    }

    static func confirm(title: String, message: String) -> Bool {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Continue")
        alert.addButton(withTitle: "Cancel")
        return alert.runModal() == .alertFirstButtonReturn
    }

    static func showError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "U-Right"
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.runModal()
    }

    static func showInfo(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.runModal()
    }
}
