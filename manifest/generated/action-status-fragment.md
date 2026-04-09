<!-- AUTO-GENERATED FILE. DO NOT EDIT. -->
<!-- Source of truth: manifest/actions.json -->

Manifest version: 1

| ID | Status | Category | Default Visible | Contexts | Required Tool |
| --- | --- | --- | --- | --- | --- |
| create.new-file | implemented | create | yes | file, folder, empty | - |
| create.new-folder | implemented | create | yes | file, folder, empty | - |
| submenu.templates | implemented | create | yes | file, folder, empty | - |
| open.terminal | implemented | open | yes | file, folder, mixed, empty, multi | terminal |
| open.vscode | implemented | open | yes | file, folder, mixed, empty, multi | vscode |
| open.cursor | implemented | open | yes | file, folder, mixed, empty, multi | cursor |
| open.zed | implemented | open | yes | file, folder, mixed, empty, multi | zed |
| open.ghostty | implemented | open | yes | file, folder, mixed, empty, multi | ghostty |
| copy.path | implemented | clipboard | yes | file, folder, mixed, empty, multi | - |
| copy.relative-path | beta | clipboard | yes | file, folder, multi | - |
| copy.filename | implemented | clipboard | yes | file | - |
| copy.basename | implemented | clipboard | yes | file | - |
| copy.extension | implemented | clipboard | yes | file | - |
| finder.reveal | implemented | view | yes | file, folder, multi | - |
| file.rename | implemented | fileOps | yes | file, folder | - |
| file.trash | implemented | fileOps | yes | file, folder, multi | - |
| file.duplicate | beta | fileOps | yes | file, folder, multi | - |
| file.compress | beta | fileOps | yes | file, folder, multi | - |
| file.json-format | beta | fileOps | yes | file | - |
| file.toggle-executable | beta | fileOps | yes | file | - |
| git.status | beta | git | yes | file, folder, empty | - |
| ai.ask-claude | implemented | ai | yes | file, folder, mixed, empty, multi | - |
| ai.ask-codex | implemented | ai | yes | file, folder, mixed, empty, multi | - |
| ai.explain-project | planned | ai | no | folder, empty, multi | - |
| ai.summarize-files | planned | ai | no | file, folder, mixed, empty, multi | - |
| ai.generate-readme | planned | ai | no | folder, empty, multi | - |
| ai.generate-gitignore | planned | ai | no | folder, empty | - |
| ai.review-code | planned | ai | no | file, folder, multi | - |
| ai.refactor-file | planned | ai | no | file | - |
| ai.write-tests | planned | ai | no | file, folder | - |
| ai.explain-error | planned | ai | no | file | - |
| ai.json-schema | planned | ai | no | file | - |
| ai.commit-message | planned | ai | no | folder, empty, multi | - |
| ai.pr-summary | planned | ai | no | folder, empty, multi | - |
| ai.summarize-selection | planned | ai | no | multi | - |
| ai.ask-selection | planned | ai | no | multi | - |
| ai.repeat-last | planned | ai | no | file, folder, mixed, empty, multi | - |
| submenu.scripts | beta | scripts | yes | file, folder, mixed, empty, multi | - |
| view.toggle-hidden | beta | view | yes | file, folder, empty | - |
| view.refresh | beta | view | yes | file, folder, mixed, empty, multi | - |
| folder.search | planned | view | no | folder, empty | - |
| folder.size | planned | view | no | folder, empty | - |
| folder.count | planned | view | no | folder, empty | - |
| multi.batch-rename | planned | fileOps | no | multi | - |

