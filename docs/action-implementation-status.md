# U-Right 动作实现状态

更新时间：2026-04-08

本文档只记录当前默认主线的动作状态；架构、开发/验证入口、边界和 AI/CLI 约束统一见 [guide.md](./guide.md)。

- 元数据源：`manifest/actions.json`
- 刷新命令：`npm run generate:action-registry`
- 运行时执行器：`electron/src/main/application/actions/dispatcher.ts`

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

## 补充说明

- `create.template.*`：来自内建模板与用户模板。
- `open.custom.*`：来自用户自定义 Open 设置。
- `script.run.*`：来自脚本目录与脚本设置。
- Finder 可见行为与默认设置以 manifest 生成产物和运行时快照为准。
