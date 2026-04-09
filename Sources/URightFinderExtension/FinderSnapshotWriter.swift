import Foundation
import URightShared

enum FinderSnapshotWriter {
    static func persistMenuSnapshot(
        context: FinderActionContext,
        settings: AppSettings,
        descriptors: [ActionDescriptor]
    ) {
        let snapshotURL = SharedPaths.finderMenuSnapshotFileURL()
        let snapshot = FinderMenuSnapshot(
            appGroupIdentifier: URightConstants.appGroupIdentifier,
            settingsVersion: SettingsStore.shared.currentDocumentVersionNumber(),
            context: context,
            menu: descriptors,
            availability: ActionRegistry.snapshotAvailability(context: context, settings: settings)
        )

        do {
            let data = try JSONEncoder().encode(snapshot)
            try data.write(to: snapshotURL, options: .atomic)
            Logger.shared.info(
                "extension",
                "Persisted finder menu snapshot path=\(snapshotURL.path) selectionKind=\(context.selectionKind.rawValue) actionCount=\(descriptors.count)"
            )
        } catch {
            Logger.shared.error("extension", "Failed to persist finder menu snapshot: \(error.localizedDescription)")
        }
    }
}
