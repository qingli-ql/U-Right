import FinderSync
import Foundation
import URightShared

enum FinderContextBuilder {
    static func build(
        menuKind: FIMenuKind,
        selectedItemURLs rawSelectedURLs: [URL],
        targetedURL: URL?
    ) -> FinderActionContext {
        let selectedURLs: [URL]
        let primaryURL: URL?
        let currentDirectoryURL: URL?

        switch menuKind {
        case .contextualMenuForItems:
            if rawSelectedURLs.isEmpty, let targetedURL {
                selectedURLs = [targetedURL]
                primaryURL = targetedURL
            } else {
                selectedURLs = rawSelectedURLs
                primaryURL = rawSelectedURLs.first
            }
            if let first = primaryURL, !FileSystemHelper.metadata(for: first).isDirectory {
                currentDirectoryURL = first.deletingLastPathComponent()
            } else {
                currentDirectoryURL = primaryURL?.deletingLastPathComponent() ?? targetedURL
            }
        case .contextualMenuForContainer, .contextualMenuForSidebar, .toolbarItemMenu:
            selectedURLs = rawSelectedURLs
            primaryURL = rawSelectedURLs.first
            currentDirectoryURL = targetedURL
        @unknown default:
            selectedURLs = rawSelectedURLs
            primaryURL = rawSelectedURLs.first ?? targetedURL
            currentDirectoryURL = targetedURL
        }

        let selectionKind = resolveSelectionKind(selectedURLs: selectedURLs, primaryURL: primaryURL)
        let metadata = selectedURLs.map(FileSystemHelper.metadata)
        let resolvedPrimaryTarget = primaryURL
        let resolvedSelectionDirectory = resolveSelectionDirectory(
            selectionKind: selectionKind,
            selectedURLs: selectedURLs,
            primaryURL: primaryURL,
            currentDirectoryURL: currentDirectoryURL
        )
        let resolvedTargetDirectory = resolveTargetDirectory(
            selectionKind: selectionKind,
            primaryURL: primaryURL,
            currentDirectoryURL: currentDirectoryURL,
            resolvedSelectionDirectory: resolvedSelectionDirectory
        )
        let workingDirectory = resolveWorkingDirectory(
            selectionKind: selectionKind,
            resolvedSelectionDirectory: resolvedSelectionDirectory,
            resolvedTargetDirectory: resolvedTargetDirectory
        )

        return FinderActionContext(
            selectedURLs: selectedURLs,
            primaryURL: primaryURL,
            currentDirectoryURL: currentDirectoryURL,
            resolvedTargetDirectory: resolvedTargetDirectory,
            resolvedPrimaryTarget: resolvedPrimaryTarget,
            resolvedSelectionDirectory: resolvedSelectionDirectory,
            selectionKind: selectionKind,
            detectedTools: ToolDetector.shared.detect(),
            fileMetadata: metadata,
            extensionWindowTitle: String(menuKind.rawValue),
            capabilities: .init(
                hasWorkingDirectory: workingDirectory != nil,
                hasWritableTarget: hasWritableTarget(selectedURLs: selectedURLs, workingDirectory: workingDirectory),
                scriptNames: availableScriptNames()
            )
        )
    }

    private static func availableScriptNames(fileManager: FileManager = .default) -> [String] {
        let urls = (try? fileManager.contentsOfDirectory(at: SharedPaths.scriptsDirectory(), includingPropertiesForKeys: nil)) ?? []
        return urls
            .filter { $0.pathExtension != "" || fileManager.isExecutableFile(atPath: $0.path) }
            .map(\.lastPathComponent)
            .sorted()
    }

    private static func resolveSelectionKind(selectedURLs: [URL], primaryURL: URL?) -> SelectionKind {
        if selectedURLs.count > 1 {
            return .multi
        }
        if let primaryURL {
            return FileSystemHelper.metadata(for: primaryURL).isDirectory ? .folder : .file
        }
        return .empty
    }

    private static func resolveSelectionDirectory(
        selectionKind: SelectionKind,
        selectedURLs: [URL],
        primaryURL: URL?,
        currentDirectoryURL: URL?
    ) -> URL? {
        switch selectionKind {
        case .file:
            return primaryURL?.deletingLastPathComponent()
        case .folder:
            return primaryURL
        case .empty:
            return currentDirectoryURL
        case .multi, .mixed:
            let candidateDirectories = selectedURLs.map { url -> URL in
                let meta = FileSystemHelper.metadata(for: url)
                return meta.isDirectory ? url : url.deletingLastPathComponent()
            }
            let unique = Dictionary(grouping: candidateDirectories, by: \.path).compactMap(\.value.first)
            if unique.count == 1 {
                return unique.first
            }
            return currentDirectoryURL ?? primaryURL?.deletingLastPathComponent()
        }
    }

    private static func resolveTargetDirectory(
        selectionKind: SelectionKind,
        primaryURL: URL?,
        currentDirectoryURL: URL?,
        resolvedSelectionDirectory: URL?
    ) -> URL? {
        switch selectionKind {
        case .file:
            return primaryURL?.deletingLastPathComponent()
        case .folder:
            return primaryURL
        case .empty:
            return currentDirectoryURL
        case .multi, .mixed:
            return currentDirectoryURL ?? resolvedSelectionDirectory
        }
    }

    private static func resolveWorkingDirectory(
        selectionKind: SelectionKind,
        resolvedSelectionDirectory: URL?,
        resolvedTargetDirectory: URL?
    ) -> URL? {
        switch selectionKind {
        case .file, .folder, .empty:
            return resolvedTargetDirectory
        case .multi, .mixed:
            return resolvedSelectionDirectory ?? resolvedTargetDirectory
        }
    }

    private static func hasWritableTarget(selectedURLs: [URL], workingDirectory: URL?) -> Bool {
        // Finder Sync runs in a sandbox with read-only access to selected files.
        // Menu visibility should answer whether the host app has a meaningful target,
        // while the Electron host performs the real write permission check later.
        if !selectedURLs.isEmpty {
            return true
        }
        return workingDirectory != nil
    }
}
