import Foundation
import URightShared

@MainActor
final class TemplateService {
    func availableTemplates() -> [TemplateDescriptor] {
        RuntimeTemplates.all(settings: SettingsStore.shared.load()) + customTemplates()
    }

    func createFile(using template: TemplateDescriptor, in directory: URL, promptTitle: String = "New File") throws -> URL? {
        guard let filename = PromptPanelController.promptForText(title: promptTitle, message: "输入文件名", defaultValue: suggestedName(for: template)) else {
            return nil
        }
        let sanitized = FileSystemHelper.sanitizedFileName(filename)
        guard !sanitized.isEmpty else { throw HostCommandError.operationFailed("文件名不能为空") }
        let target = directory.appendingPathComponent(sanitized)
        if FileManager.default.fileExists(atPath: target.path) {
            let response = PromptPanelController.confirm(title: "文件已存在", message: "\(sanitized) 已存在，是否覆盖？")
            guard response else { return nil }
        }
        try template.starterContent.data(using: .utf8)?.write(to: target, options: .atomic)
        if template.makeExecutable {
            try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: target.path)
        }
        return target
    }

    func createFolder(in directory: URL) throws -> URL? {
        guard let name = PromptPanelController.promptForText(title: "New Folder", message: "输入文件夹名称", defaultValue: "New Folder") else {
            return nil
        }
        let sanitized = FileSystemHelper.sanitizedFileName(name)
        let target = directory.appendingPathComponent(sanitized, isDirectory: true)
        try FileManager.default.createDirectory(at: target, withIntermediateDirectories: false)
        return target
    }

    private func suggestedName(for template: TemplateDescriptor) -> String {
        if template.fileExtension.isEmpty || template.fileNameSuggestion.contains(".") {
            return template.fileNameSuggestion
        }
        return "\(template.fileNameSuggestion).\(template.fileExtension)"
    }

    private func customTemplates() -> [TemplateDescriptor] {
        let folder = SettingsStore.shared.load().templates.customTemplateFolder
        guard !folder.isEmpty else { return [] }
        let urls = (try? FileManager.default.contentsOfDirectory(at: URL(fileURLWithPath: folder, isDirectory: true), includingPropertiesForKeys: nil)) ?? []
        return urls.compactMap { url in
            guard let content = try? String(contentsOf: url, encoding: .utf8) else { return nil }
            return TemplateDescriptor(id: "custom.\(url.lastPathComponent)", title: url.lastPathComponent, fileNameSuggestion: url.deletingPathExtension().lastPathComponent, fileExtension: url.pathExtension, starterContent: content)
        }
    }
}
