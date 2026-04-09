import Foundation
import Testing
@testable import URightShared

struct ActionAvailabilityServiceTests {
    @Test
    func requiresAIMissingBackendShowsDisabledReasonInPreview() {
        let definition = ActionDefinition(
            id: ActionIDs.aiAskCodex,
            title: "Ask Codex",
            systemImageName: "sparkles",
            defaultCategory: .ai,
            supportedContexts: [.file],
            requirements: .init(requiresAI: true),
            defaultOrder: 10
        )
        let context = FinderActionContext(
            selectedURLs: [URL(fileURLWithPath: "/tmp/example.txt")],
            primaryURL: URL(fileURLWithPath: "/tmp/example.txt"),
            currentDirectoryURL: URL(fileURLWithPath: "/tmp"),
            selectionKind: .file,
            detectedTools: [.codex: ToolAvailability(kind: .codex, isInstalled: false)],
            fileMetadata: []
        )
        let settings = AppSettings(
            contextMenu: .init(showUnavailableInPreview: true),
            ai: .init(enabled: true, actionVisibility: [ActionIDs.aiAskCodex])
        )

        let availability = ActionAvailabilityService.evaluate(definition: definition, context: context, settings: settings)

        #expect(availability.isVisible == true)
        #expect(availability.isEnabled == false)
        #expect(availability.disabledReason == "未检测到 Codex CLI")
    }

    @Test
    func requiredToolMissingShowsDisabledReasonInPreview() {
        let definition = ActionDefinition(
            id: "open.ghostty-test",
            title: "Open in Ghostty",
            systemImageName: "terminal",
            defaultCategory: .open,
            supportedContexts: [.folder],
            requirements: .init(requiredTool: .ghostty),
            defaultOrder: 20
        )
        let context = FinderActionContext(
            selectedURLs: [URL(fileURLWithPath: "/tmp/project")],
            primaryURL: URL(fileURLWithPath: "/tmp/project"),
            currentDirectoryURL: URL(fileURLWithPath: "/tmp"),
            selectionKind: .folder,
            detectedTools: [.ghostty: ToolAvailability(kind: .ghostty, isInstalled: false)],
            fileMetadata: []
        )
        let settings = AppSettings(contextMenu: .init(showUnavailableInPreview: true))

        let availability = ActionAvailabilityService.evaluate(definition: definition, context: context, settings: settings)

        #expect(availability.isVisible == true)
        #expect(availability.isEnabled == false)
        #expect(availability.disabledReason == "未检测到 ghostty")
    }
}
