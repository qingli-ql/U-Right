import Foundation
import Testing
@testable import URightShared

struct SettingsMigrationTests {
    @Test
    func decodesLegacyFlatSettingsIntoNestedV3Shape() throws {
        let legacySettingsJSON = #"""
        {
          "launchAtLogin": true,
          "showMenuBarIcon": false,
          "showExtensionStatus": false,
          "defaultTerminal": "ghostty",
          "defaultEditor": "cursor",
          "aiEnabled": false,
          "preferredAIProvider": "openAICompatible",
          "apiBaseURL": "https://example.invalid/v1",
          "apiKey": "sk-test",
          "apiModel": "gpt-test",
          "systemPromptTemplate": "Legacy prompt",
          "maxContextFileSize": 12345,
          "maxFolderScanDepth": 5,
          "includeHiddenFiles": true,
          "customTemplateFolder": "/Users/example/Templates",
          "debugLogging": true,
          "customExecutablePaths": {
            "ghostty": "/Applications/Ghostty.app"
          },
          "toolPreferences": [
            {
              "kind": "ghostty",
              "customPath": "/Applications/Ghostty.app",
              "allowMenuActions": true
            }
          ],
          "aiActionVisibility": [
            "ai.ask-codex"
          ],
          "pinnedActionIDs": [
            "open.terminal"
          ],
          "recentActionIDs": [
            "copy.path"
          ],
          "lastAIActionID": "ai.ask-codex",
          "contextMenu": {
            "categorySettings": [],
            "actionSettings": [],
            "collapseSingleActionGroups": false,
            "showUnavailableInPreview": true
          },
          "customActions": {
            "openActions": []
          }
        }
        """#

        let decoder = JSONDecoder()
        let settings = try decoder.decode(AppSettings.self, from: Data(legacySettingsJSON.utf8))

        #expect(settings.general.launchAtLogin == true)
        #expect(settings.general.showMenuBarIcon == false)
        #expect(settings.general.showExtensionStatus == false)
        #expect(settings.integrations.defaultTerminal == .ghostty)
        #expect(settings.integrations.defaultEditor == .cursor)
        #expect(settings.integrations.customExecutablePaths["ghostty"] == "/Applications/Ghostty.app")
        #expect(settings.templates.customTemplateFolder == "/Users/example/Templates")
        #expect(settings.templates.hiddenBuiltInTemplateIDs == ["css", "javascript", "typescript"])
        #expect(settings.ai.enabled == false)
        #expect(settings.ai.preferredProvider == .openAICompatible)
        #expect(settings.ai.actionVisibility == ["ai.ask-codex"])
        #expect(settings.advanced.debugLogging == true)
        #expect(settings.contextMenu.collapseSingleActionGroups == false)
        #expect(settings.contextMenu.showUnavailableInPreview == true)

        let encodedObject = try JSONSerialization.jsonObject(with: JSONEncoder().encode(settings)) as? [String: Any]
        #expect(encodedObject?["launchAtLogin"] == nil)
        #expect(encodedObject?["defaultTerminal"] == nil)
        #expect(encodedObject?["customTemplateFolder"] == nil)

        let general = encodedObject?["general"] as? [String: Any]
        let templates = encodedObject?["templates"] as? [String: Any]
        #expect(general?["launchAtLogin"] as? Bool == true)
        #expect(templates?["customTemplateFolder"] as? String == "/Users/example/Templates")
        #expect((templates?["hiddenBuiltInTemplateIDs"] as? [String]) == ["css", "javascript", "typescript"])
    }
}
