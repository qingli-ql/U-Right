import Foundation
import URightShared

enum FixtureKind: String {
    case file
    case folder
}

func buildRequest(_ kind: FixtureKind) -> ActionRequest {
    let basePath = "/Users/example/Projects/U Right 示例"
    let filePath = "\(basePath)/含 空格/README 中文.md"
    let folderPath = "\(basePath)/含 空格"
    let targetPath = kind == .file ? filePath : folderPath
    let targetURL = URL(fileURLWithPath: targetPath)
    let currentDirectoryURL = URL(fileURLWithPath: basePath)
    let fileMetadata = [
        FileMetadata(
            url: targetURL,
            isDirectory: kind == .folder,
            fileSize: kind == .folder ? nil : 1024,
            uti: kind == .folder ? "public.folder" : "net.daringfireball.markdown",
            fileExtension: kind == .folder ? "" : "md",
            isScriptLike: false
        )
    ]
    let context = FinderActionContext(
        selectedURLs: [targetURL],
        primaryURL: targetURL,
        currentDirectoryURL: currentDirectoryURL,
        resolvedTargetDirectory: kind == .folder ? targetURL : currentDirectoryURL,
        resolvedPrimaryTarget: targetURL,
        resolvedSelectionDirectory: currentDirectoryURL,
        selectionKind: kind == .folder ? .folder : .file,
        detectedTools: [
            .vscode: ToolAvailability(kind: .vscode, isInstalled: true, executablePath: "/Applications/Visual Studio Code.app"),
            .codex: ToolAvailability(kind: .codex, isInstalled: false, executablePath: nil, appPath: nil)
        ],
        fileMetadata: fileMetadata,
        extensionWindowTitle: "U-Right",
        capabilities: .init(hasWorkingDirectory: true, hasWritableTarget: true, scriptNames: ["format-json.sh", "quick-open.command"])
    )

    return ActionRequest(
        id: kind == .folder ? UUID(uuidString: "0B50A5A9-5F72-4E16-B7A3-9B193C2D8E10")! : UUID(uuidString: "5E7C0F5E-2875-4E71-95F5-0A9B35E5C2F1")!,
        actionID: kind == .folder ? "open.vscode" : "copy.path",
        context: context,
        createdAt: Date(timeIntervalSince1970: 1_712_630_400.123)
    )
}

let requestedKind = CommandLine.arguments.dropFirst().first.flatMap(FixtureKind.init(rawValue:)) ?? .folder
let data = try ActionRequestWireCodec.encodeCanonicalJSON(buildRequest(requestedKind))
FileHandle.standardOutput.write(data)
