import Foundation
import URightShared

struct RuntimeParityInput: Codable {
    var cases: [RuntimeParityCaseInput]
}

struct RuntimeParityCaseInput: Codable {
    var name: String
    var settings: AppSettings
    var context: FinderActionContextWire
}

struct RuntimeParityOutput: Codable {
    var cases: [RuntimeParityCaseOutput]
}

struct RuntimeParityCaseOutput: Codable {
    var name: String
    var leafActions: [String]
    var categoryPlacement: [String: String]
    var disabledReasons: [String: String]
}

private struct LeafRecord {
    var actionID: String
    var category: String
    var disabledReason: String?
}

private func makeContext(from wire: FinderActionContextWire) throws -> FinderActionContext {
    guard let selectionKind = SelectionKind(rawValue: wire.selectionKind) else {
        throw NSError(
            domain: "RuntimeParityEmitter",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Invalid selection kind: \(wire.selectionKind)"]
        )
    }
    let detectedTools = try Dictionary(uniqueKeysWithValues: wire.detectedTools.map { key, availability in
        guard let toolKind = ToolKind(rawValue: key), let availabilityKind = ToolKind(rawValue: availability.kind), toolKind == availabilityKind else {
            throw NSError(
                domain: "RuntimeParityEmitter",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Invalid tool kind: \(key)"]
            )
        }
        return (
            toolKind,
            ToolAvailability(
                kind: availabilityKind,
                isInstalled: availability.isInstalled,
                executablePath: availability.executablePath,
                appPath: availability.appPath
            )
        )
    })

    return FinderActionContext(
        selectedURLs: wire.selectedURLs.map { URL(fileURLWithPath: $0) },
        primaryURL: wire.primaryURL.map { URL(fileURLWithPath: $0) },
        currentDirectoryURL: wire.currentDirectoryURL.map { URL(fileURLWithPath: $0) },
        resolvedTargetDirectory: wire.resolvedTargetDirectory.map { URL(fileURLWithPath: $0) },
        resolvedPrimaryTarget: wire.resolvedPrimaryTarget.map { URL(fileURLWithPath: $0) },
        resolvedSelectionDirectory: wire.resolvedSelectionDirectory.map { URL(fileURLWithPath: $0) },
        selectionKind: selectionKind,
        detectedTools: detectedTools,
        fileMetadata: wire.fileMetadata.map {
            FileMetadata(
                url: URL(fileURLWithPath: $0.url),
                isDirectory: $0.isDirectory,
                fileSize: $0.fileSize,
                uti: $0.uti,
                fileExtension: $0.fileExtension,
                isScriptLike: $0.isScriptLike
            )
        },
        extensionWindowTitle: wire.extensionWindowTitle,
        capabilities: wire.capabilities.map {
            .init(
                hasWorkingDirectory: $0.hasWorkingDirectory,
                hasWritableTarget: $0.hasWritableTarget,
                scriptNames: $0.scriptNames
            )
        }
    )
}

private func flattenLeaves(_ descriptors: [ActionDescriptor], output: inout [LeafRecord]) {
    for descriptor in descriptors {
        if descriptor.children.isEmpty {
            output.append(
                LeafRecord(
                    actionID: descriptor.id,
                    category: descriptor.category.rawValue,
                    disabledReason: descriptor.statusBadge
                )
            )
            continue
        }
        flattenLeaves(descriptor.children, output: &output)
    }
}

private func buildCaseOutput(_ input: RuntimeParityCaseInput) throws -> RuntimeParityCaseOutput {
    let context = try makeContext(from: input.context)
    let menu = ActionRegistry.topLevelActions(context: context, settings: input.settings)
    var leaves: [LeafRecord] = []
    flattenLeaves(menu, output: &leaves)
    leaves.sort { lhs, rhs in
        if lhs.actionID == rhs.actionID {
            return lhs.category < rhs.category
        }
        return lhs.actionID < rhs.actionID
    }

    var categoryPlacement: [String: String] = [:]
    var disabledReasons: [String: String] = [:]
    for leaf in leaves {
        categoryPlacement[leaf.actionID] = leaf.category
        if let disabledReason = leaf.disabledReason {
            disabledReasons[leaf.actionID] = disabledReason
        }
    }

    return RuntimeParityCaseOutput(
        name: input.name,
        leafActions: leaves.map(\.actionID),
        categoryPlacement: categoryPlacement,
        disabledReasons: disabledReasons
    )
}

do {
    guard CommandLine.arguments.count >= 2 else {
        fputs("Usage: swift run RuntimeParityEmitter <input-json>\n", stderr)
        exit(2)
    }

    let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
    let inputData = try Data(contentsOf: inputURL)
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let input = try decoder.decode(RuntimeParityInput.self, from: inputData)
    let outputCases = try input.cases.map(buildCaseOutput)
    let output = RuntimeParityOutput(cases: outputCases)

    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let encoded = try encoder.encode(output)
    FileHandle.standardOutput.write(encoded)
} catch {
    fputs("Runtime parity emitter failed: \(error)\n", stderr)
    exit(1)
}
