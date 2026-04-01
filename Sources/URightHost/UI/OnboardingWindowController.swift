import AppKit

@MainActor
final class OnboardingWindowController: NSWindowController {
    init() {
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 560, height: 360), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "Welcome to U-Right"
        super.init(window: window)
        configure()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    private func configure() {
        let text = NSTextView(frame: window?.contentView?.bounds ?? .zero)
        text.isEditable = false
        text.drawsBackground = false
        text.string = "1. Build or install U-Right.app\n2. Launch the menu bar app\n3. Open System Settings → Privacy & Security → Extensions → Finder Extensions\n4. Enable U-Right Finder Sync\n5. Configure Claude / Codex / editors in Settings\n\n如果 Finder 菜单未刷新，可执行 Makefile 中的 open-extension-settings 或重启 Finder。"
        text.font = .systemFont(ofSize: 14)
        text.textContainerInset = NSSize(width: 16, height: 16)
        window?.contentView = text
    }
}
