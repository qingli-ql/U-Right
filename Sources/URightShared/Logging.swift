import Foundation

public final class Logger: @unchecked Sendable {
    public static let shared = Logger()

    private let queue = DispatchQueue(label: "com.openai.uright.logger", qos: .utility)
    private let dateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    public func info(_ subsystem: String, _ message: String) {
        write(level: "INFO", subsystem: subsystem, message: message)
    }

    public func error(_ subsystem: String, _ message: String) {
        write(level: "ERROR", subsystem: subsystem, message: message)
    }

    public func debug(_ subsystem: String, _ message: String) {
        if SettingsStore.shared.load().debugLogging {
            write(level: "DEBUG", subsystem: subsystem, message: message)
        }
    }

    private func write(level: String, subsystem: String, message: String) {
        let safeMessage = message.replacingOccurrences(of: SettingsStore.shared.load().apiKey, with: "***")
        let line = "\(dateFormatter.string(from: .now)) [\(level)] [\(subsystem)] \(safeMessage)\n"
        queue.async {
            let url = SharedPaths.logFileURL()
            if let data = line.data(using: .utf8) {
                if FileManager.default.fileExists(atPath: url.path) {
                    if let handle = try? FileHandle(forWritingTo: url) {
                        try? handle.seekToEnd()
                        try? handle.write(contentsOf: data)
                        try? handle.close()
                    }
                } else {
                    try? data.write(to: url, options: .atomic)
                }
            }
        }
    }

    public func loadEntries(limit: Int = 500) -> [LogEntry] {
        guard let contents = try? String(contentsOf: SharedPaths.logFileURL(), encoding: .utf8) else { return [] }
        return contents.split(separator: "\n").suffix(limit).compactMap { line in
            let parts = line.split(separator: "]", maxSplits: 2, omittingEmptySubsequences: false)
            guard parts.count == 3 else { return nil }
            let timestampString = parts[0].replacingOccurrences(of: "[", with: "").trimmingCharacters(in: .whitespaces)
            let level = parts[1].replacingOccurrences(of: " [", with: "").trimmingCharacters(in: CharacterSet(charactersIn: " []"))
            let tail = parts[2].trimmingCharacters(in: .whitespaces)
            let subsystemAndMessage = tail.split(separator: " ", maxSplits: 1).map(String.init)
            let subsystem = subsystemAndMessage.first?.trimmingCharacters(in: CharacterSet(charactersIn: "[]")) ?? "app"
            let message = subsystemAndMessage.count > 1 ? subsystemAndMessage[1] : ""
            return LogEntry(timestamp: ISO8601DateFormatter().date(from: timestampString) ?? .now, level: level, subsystem: subsystem, message: message)
        }
    }
}
