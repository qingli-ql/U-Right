import Foundation
import URightShared

@MainActor
final class HostActionDispatcher {
    private let executor = ActionExecutionService()

    func perform(request: ActionRequest) {
        let settings = SettingsStore.shared.load()
        let result = executor.execute(request: request, settings: settings)
        switch result {
        case .success(let message):
            if let message, !message.isEmpty {
                Logger.shared.info("dispatcher", message)
            }
        case .userCancelled:
            Logger.shared.info("dispatcher", "Action cancelled: \(request.actionID)")
        case .failure(let errorMessage):
            Logger.shared.error("dispatcher", errorMessage)
            PromptPanelController.showError(errorMessage)
        }
    }
}

extension Process {
    @discardableResult
    static func runSync(_ executableURL: URL, arguments: [String], currentDirectoryURL: URL? = nil) throws -> Process {
        let process = Process()
        process.executableURL = executableURL
        process.arguments = arguments
        process.currentDirectoryURL = currentDirectoryURL
        try process.run()
        process.waitUntilExit()
        return process
    }
}
