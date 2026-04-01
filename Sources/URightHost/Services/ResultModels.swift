import Foundation

struct AIResultPayload {
    var title: String
    var markdown: String
    var workingDirectory: URL?
    var suggestedFileURL: URL?
    var canApplyToFile: Bool
}
