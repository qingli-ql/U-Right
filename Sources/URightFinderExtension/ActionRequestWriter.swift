import Foundation
import URightShared

enum ActionRequestWriter {
    @discardableResult
    static func persist(actionID: String, context: FinderActionContext) throws -> ActionRequest {
        let request = ActionRequest(actionID: actionID, context: context)
        _ = try ActionHandoff.saveRequest(request)
        Logger.shared.info(
            "extension",
            "Action clicked requestID=\(request.id.uuidString) action=\(request.actionID) actionTitle=\(ActionCatalog.title(for: request.actionID)) selectionKind=\(request.context.selectionKind.rawValue) selectedCount=\(request.context.selectedURLs.count) primary=\(request.context.primaryURL?.path ?? "-") currentDir=\(request.context.currentDirectoryURL?.path ?? "-")"
        )
        return request
    }
}
