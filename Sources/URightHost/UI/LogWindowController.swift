import AppKit
import URightShared

@MainActor
final class LogWindowController: NSWindowController {
    private let textView = NSTextView()

    init() {
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 760, height: 420), styleMask: [.titled, .closable, .resizable], backing: .buffered, defer: false)
        window.title = "U-Right Logs"
        super.init(window: window)
        configure()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    func reload() {
        let entries = Logger.shared.loadEntries().map { "[\($0.level)] \($0.subsystem) \($0.message)" }.joined(separator: "\n")
        textView.string = entries
    }

    private func configure() {
        let scroll = NSScrollView(frame: window?.contentView?.bounds ?? .zero)
        scroll.autoresizingMask = [.width, .height]
        scroll.hasVerticalScroller = true
        textView.isEditable = false
        textView.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        scroll.documentView = textView
        window?.contentView = scroll
        reload()
    }
}
