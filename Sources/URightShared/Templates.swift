import Foundation

public enum BuiltInTemplates {
    public static let all: [TemplateDescriptor] = [
        .init(id: "empty", title: "Empty File...", fileNameSuggestion: "untitled", fileExtension: "", starterContent: ""),
        .init(id: "text", title: "Text File", fileNameSuggestion: "notes", fileExtension: "txt", starterContent: ""),
        .init(id: "markdown", title: "Markdown File", fileNameSuggestion: "README", fileExtension: "md", starterContent: "# Title\n\n"),
        .init(id: "json", title: "JSON File", fileNameSuggestion: "data", fileExtension: "json", starterContent: "{\n  \"name\": \"value\"\n}\n"),
        .init(id: "python", title: "Python File", fileNameSuggestion: "main", fileExtension: "py", starterContent: "#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\n\ndef main() -> None:\n    print(\"Hello from U-Right\")\n\n\nif __name__ == \"__main__\":\n    main()\n", makeExecutable: true),
        .init(id: "shell", title: "Shell Script", fileNameSuggestion: "script", fileExtension: "sh", starterContent: "#!/bin/bash\nset -euo pipefail\n\n", makeExecutable: true),
        .init(id: "html", title: "HTML File", fileNameSuggestion: "index", fileExtension: "html", starterContent: "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <title>U-Right</title>\n</head>\n<body>\n</body>\n</html>\n"),
        .init(id: "css", title: "CSS File", fileNameSuggestion: "styles", fileExtension: "css", starterContent: ":root {\n  color-scheme: light dark;\n}\n"),
        .init(id: "javascript", title: "JavaScript File", fileNameSuggestion: "app", fileExtension: "js", starterContent: "console.log('Hello from U-Right');\n"),
        .init(id: "typescript", title: "TypeScript File", fileNameSuggestion: "app", fileExtension: "ts", starterContent: "export function main(): void {\n  console.log('Hello from U-Right');\n}\n\nmain();\n"),
        .init(id: "readme", title: "README.md", fileNameSuggestion: "README", fileExtension: "md", starterContent: "# Project\n\n## Overview\n\n"),
        .init(id: "gitignore", title: ".gitignore", fileNameSuggestion: ".gitignore", fileExtension: "", starterContent: ".DS_Store\nnode_modules/\n.build/\nDerivedData/\n"),
        .init(id: "env", title: ".env", fileNameSuggestion: ".env", fileExtension: "", starterContent: "# Environment variables\n")
    ]
}
