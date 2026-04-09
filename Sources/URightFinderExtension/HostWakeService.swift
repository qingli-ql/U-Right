import AppKit
import Foundation
import URightShared

enum HostWakeService {
    static let hostRuntimeKey = "URightHostRuntime"
    static let expectedHostRuntimeKey = "URightExpectedHostRuntime"
    static let electronRuntimeValue = "electron"

    static func wakeVerifiedHostApplication(
        workspace: NSWorkspace = .shared,
        extensionBundle: Bundle = .main
    ) {
        switch HostWakePolicy.decision() {
        case .skipActiveDevHost:
            Logger.shared.info("extension", "Skipping host wake because active dev host marker is present")
            return
        case .wakeInstalledHost:
            break
        }

        guard let hostURL = resolveHostApplicationURL(extensionBundle: extensionBundle) else {
            Logger.shared.error(
                "extension",
                "Failed to resolve unique Electron host app bundle extensionBundle=\(extensionBundle.bundleURL.path)"
            )
            return
        }

        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = false

        Logger.shared.info(
            "extension",
            "Host identity validated appPath=\(hostURL.path) hostRuntime=\(electronRuntimeValue) extensionExpectedRuntime=\(electronRuntimeValue)"
        )
        Logger.shared.info(
            "extension",
            "Attempting to wake verified host app path=\(hostURL.path) runtime=\(electronRuntimeValue)"
        )
        workspace.openApplication(at: hostURL, configuration: configuration)
    }

    static func resolveHostApplicationURL(extensionBundle: Bundle = .main) -> URL? {
        guard
            let expectedRuntime = extensionBundle.object(forInfoDictionaryKey: expectedHostRuntimeKey) as? String,
            expectedRuntime == electronRuntimeValue
        else {
            Logger.shared.error(
                "extension",
                "Extension expected host runtime is missing or invalid key=\(expectedHostRuntimeKey)"
            )
            return nil
        }

        var candidate = extensionBundle.bundleURL.standardizedFileURL

        while true {
            if candidate.pathExtension.lowercased() == "app" {
                guard let hostBundle = Bundle(url: candidate) else {
                    Logger.shared.error("extension", "Failed to read host bundle info path=\(candidate.path)")
                    return nil
                }

                guard
                    let actualRuntime = hostBundle.object(forInfoDictionaryKey: hostRuntimeKey) as? String,
                    actualRuntime == electronRuntimeValue
                else {
                    Logger.shared.error(
                        "extension",
                        "Host runtime validation failed path=\(candidate.path) expected=\(electronRuntimeValue)"
                    )
                    return nil
                }

                let expectedBundleURL = extensionBundle.bundleURL
                    .deletingLastPathComponent()
                    .deletingLastPathComponent()
                    .deletingLastPathComponent()
                if candidate.standardizedFileURL.path != expectedBundleURL.standardizedFileURL.path {
                    Logger.shared.error(
                        "extension",
                        "Host bundle path mismatch path=\(candidate.path) expected=\(expectedBundleURL.path)"
                    )
                    return nil
                }

                return candidate
            }

            let parent = candidate.deletingLastPathComponent()
            if parent.path == candidate.path {
                return nil
            }
            candidate = parent
        }
    }
}
