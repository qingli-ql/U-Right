import AppKit
import Foundation

@MainActor
final class ResultWindowController: NSWindowController {
    private let textView = NSTextView()
    private var payload: AIResultPayload
    private let onApply: ((String) -> Void)?
    private let onOpenInEditor: (() -> Void)?

    init(payload: AIResultPayload, onApply: ((String) -> Void)? = nil, onOpenInEditor: (() -> Void)? = nil) {
        self.payload = payload
        self.onApply = onApply
        self.onOpenInEditor = onOpenInEditor

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 760, height: 560),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = payload.title
        super.init(window: window)
        configureWindow()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    func appendStreamingText(_ chunk: String) {
        DispatchQueue.main.async {
            self.textView.textStorage?.append(NSAttributedString(string: chunk))
            self.payload.markdown += chunk
            self.textView.scrollToEndOfDocument(nil)
        }
    }

    private func configureWindow() {
        let scroll = NSScrollView(frame: window?.contentView?.bounds ?? .zero)
        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.hasVerticalScroller = true
        scroll.borderType = .bezelBorder

        textView.isEditable = false
        textView.isRichText = true
        textView.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        textView.textContainerInset = NSSize(width: 12, height: 12)
        render(markdown: payload.markdown)
        scroll.documentView = textView

        let copyButton = NSButton(title: "Copy", target: self, action: #selector(copyText))
        let saveButton = NSButton(title: "Save As…", target: self, action: #selector(saveText))
        let applyButton = NSButton(title: "Apply to File", target: self, action: #selector(applyText))
        applyButton.isEnabled = payload.canApplyToFile
        let editorButton = NSButton(title: "Open in Editor", target: self, action: #selector(openInEditor))
        editorButton.isEnabled = onOpenInEditor != nil

        let buttonStack = NSStackView(views: [copyButton, saveButton, applyButton, editorButton])
        buttonStack.orientation = .horizontal
        buttonStack.spacing = 8
        buttonStack.edgeInsets = NSEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)

        let root = NSStackView(views: [scroll, buttonStack])
        root.orientation = .vertical
        root.translatesAutoresizingMaskIntoConstraints = false

        window?.contentView = NSView()
        window?.contentView?.addSubview(root)
        NSLayoutConstraint.activate([
            root.leadingAnchor.constraint(equalTo: window!.contentView!.leadingAnchor),
            root.trailingAnchor.constraint(equalTo: window!.contentView!.trailingAnchor),
            root.topAnchor.constraint(equalTo: window!.contentView!.topAnchor),
            root.bottomAnchor.constraint(equalTo: window!.contentView!.bottomAnchor)
        ])
    }

    private func render(markdown: String) {
        if let attributed = try? AttributedString(markdown: markdown) {
            textView.textStorage?.setAttributedString(NSAttributedString(attributed))
        } else {
            textView.string = markdown
        }
    }

    @objc private func copyText() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(payload.markdown, forType: .string)
    }

    @objc private func saveText() {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = payload.suggestedFileURL?.lastPathComponent ?? "result.md"
        if panel.runModal() == .OK, let url = panel.url {
            try? payload.markdown.data(using: .utf8)?.write(to: url, options: .atomic)
        }
    }

    @objc private func applyText() {
        guard payload.canApplyToFile, let onApply else { return }
        if PromptPanelController.confirm(title: "Apply Changes", message: "这会写回文件，是否继续？") {
            onApply(payload.markdown)
        }
    }

    @objc private func openInEditor() {
        onOpenInEditor?()
    }
}
