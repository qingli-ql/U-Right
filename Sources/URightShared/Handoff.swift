import Foundation

public enum ActionHandoff {
    public static let payloadUserInfoKey = "payload"

    public static func requestURL(for id: UUID) -> URL {
        SharedPaths.requestsDirectory().appendingPathComponent("\(id.uuidString).json")
    }

    public static func saveRequest(_ request: ActionRequest) throws -> URL {
        let data = try JSONEncoder().encode(request)
        let url = requestURL(for: request.id)
        let actionTitle = ActionCatalog.title(for: request.actionID)
        do {
            try data.write(to: url, options: .atomic)
        } catch {
            DiagnosticLogger.emit("Failed to write request file appGroup=\(URightConstants.appGroupIdentifier) path=\(url.path) requestID=\(request.id.uuidString) action=\(request.actionID) actionTitle=\(actionTitle) error=\(error.localizedDescription)")
            throw error
        }
        Logger.shared.info("handoff", "Saved request file requestID=\(request.id.uuidString) action=\(request.actionID) actionTitle=\(actionTitle) path=\(url.path)")
        let payload = data.base64EncodedString()
        DistributedNotificationCenter.default().postNotificationName(
            URightConstants.handoffNotification,
            object: request.id.uuidString,
            userInfo: [payloadUserInfoKey: payload],
            deliverImmediately: true
        )
        Logger.shared.info("handoff", "Posted distributed notification requestID=\(request.id.uuidString) action=\(request.actionID) actionTitle=\(actionTitle)")
        return url
    }

    public static func loadRequest(id: String, userInfo: [AnyHashable: Any]? = nil) -> ActionRequest? {
        if let payload = userInfo?[payloadUserInfoKey] as? String,
           let data = Data(base64Encoded: payload),
           let request = try? JSONDecoder().decode(ActionRequest.self, from: data) {
            Logger.shared.info("handoff", "Loaded request from notification payload requestID=\(request.id.uuidString) action=\(request.actionID) actionTitle=\(ActionCatalog.title(for: request.actionID))")
            return request
        }

        guard let uuid = UUID(uuidString: id) else { return nil }
        let url = requestURL(for: uuid)
        guard let data = try? Data(contentsOf: url) else {
            DiagnosticLogger.emit("Failed to load request file appGroup=\(URightConstants.appGroupIdentifier) path=\(url.path) requestID=\(id)")
            return nil
        }
        defer { try? FileManager.default.removeItem(at: url) }
        let request = try? JSONDecoder().decode(ActionRequest.self, from: data)
        if let request {
            Logger.shared.info("handoff", "Loaded request from request file requestID=\(request.id.uuidString) action=\(request.actionID) actionTitle=\(ActionCatalog.title(for: request.actionID)) path=\(url.path)")
        }
        return request
    }
}
