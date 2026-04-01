import Foundation

public enum ActionHandoff {
    public static func requestURL(for id: UUID) -> URL {
        SharedPaths.requestsDirectory().appendingPathComponent("\(id.uuidString).json")
    }

    public static func saveRequest(_ request: ActionRequest) throws -> URL {
        let url = requestURL(for: request.id)
        let data = try JSONEncoder().encode(request)
        try data.write(to: url, options: .atomic)
        DistributedNotificationCenter.default().post(name: URightConstants.handoffNotification, object: request.id.uuidString)
        return url
    }

    public static func loadRequest(id: String) -> ActionRequest? {
        guard let uuid = UUID(uuidString: id) else { return nil }
        let url = requestURL(for: uuid)
        guard let data = try? Data(contentsOf: url) else { return nil }
        defer { try? FileManager.default.removeItem(at: url) }
        return try? JSONDecoder().decode(ActionRequest.self, from: data)
    }
}
