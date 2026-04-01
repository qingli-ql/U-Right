import Foundation

public enum ActionHandoff {
    public static let payloadUserInfoKey = "payload"

    public static func requestURL(for id: UUID) -> URL {
        SharedPaths.requestsDirectory().appendingPathComponent("\(id.uuidString).json")
    }

    public static func saveRequest(_ request: ActionRequest) throws -> URL {
        let data = try JSONEncoder().encode(request)
        let url = requestURL(for: request.id)
        try data.write(to: url, options: .atomic)
        let payload = data.base64EncodedString()
        DistributedNotificationCenter.default().postNotificationName(
            URightConstants.handoffNotification,
            object: request.id.uuidString,
            userInfo: [payloadUserInfoKey: payload],
            deliverImmediately: true
        )
        return url
    }

    public static func loadRequest(id: String, userInfo: [AnyHashable: Any]? = nil) -> ActionRequest? {
        if let payload = userInfo?[payloadUserInfoKey] as? String,
           let data = Data(base64Encoded: payload),
           let request = try? JSONDecoder().decode(ActionRequest.self, from: data) {
            return request
        }

        guard let uuid = UUID(uuidString: id) else { return nil }
        let url = requestURL(for: uuid)
        guard let data = try? Data(contentsOf: url) else { return nil }
        defer { try? FileManager.default.removeItem(at: url) }
        return try? JSONDecoder().decode(ActionRequest.self, from: data)
    }
}
