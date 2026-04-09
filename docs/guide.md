# U-Right 主指南

更新时间：2026-04-08

本文只保留当前默认主线需要的内容：当前架构主线、开发/验证入口、关键坑点、设计边界、AI/CLI 约束。

## 当前架构主线

- `Finder Sync Extension`：原生 Finder 集成层，负责采集上下文、构建菜单、写请求与快照。
- `Electron Host`：默认宿主，负责设置、窗口、日志、AI 执行和复杂流程。
- `Shared / Manifest`：负责动作定义、上下文模型、配置 schema、IPC 合同和生成产物。
- `archive/native-host/Sources/URightHost/` 只保留历史参考，不参与当前 build / install / run。

## 关键入口

- `Sources/URightFinderExtension/FinderSyncExtension.swift`
- `Sources/URightShared/`
- `manifest/actions.json`
- `electron/src/main/bootstrap/index.ts`
- `electron/src/main/application/actions/dispatcher.ts`
- `electron/src/renderer/features/settings/settings-screen.tsx`

## 开发入口

```bash
make dev
```

它会清理旧进程、安装 `/Applications/U-Right.app`、重载 Finder Extension，并以 Electron Host 启动当前开发主线。

常用命令：

```bash
make doctor
make extension-status
make tail-logs
npm run electron:build
npm run validate:action-registry
npm run validate:request-queue
npm run validate:action-dispatch-smoke
npm run validate:renderer-smoke
npm run validate:settings-migration
swift test
xcodebuild -project URight.xcodeproj -scheme URightFinderSync -configuration Debug -derivedDataPath build/xcode CODE_SIGNING_ALLOWED=NO build
```

当前默认开发链路只认 `tools/` 入口；`scripts/` 和 Native Host 都不是当前主线。

## 验证入口

- Finder 改动后先重新运行 `make dev`，确认系统已启用 `U-Right Finder Sync`。
- 在 Finder 中至少真实右键四类上下文：文件、文件夹、多选、空白区域；没有真实右键就不会产生新快照。
- 文件场景抽查 `copy.path`、`file.rename`、`file.trash`；文件夹场景抽查 `create.new-file`、`create.new-folder` 和一个打开类动作。
- 多选场景确认单文件语义动作不会误显示；空白区域确认创建类动作落点正确。
- 设置改动要验证持久化，以及 Host / Extension 是否读取同一个 shared container。
- AI 改动要同时验证 CLI 存在和 CLI 缺失两条路径：`claude`、`codex` 缺失时都必须明确失败。
- 打包相关改动要补查 `/Applications/U-Right.app`、bundle 内 `.appex`、签名校验和 notarization 路径。

## 关键坑点

- 最常见的问题不是代码没跑，而是系统跑的不是你以为的那份 Host / Extension / shared container。
- Finder 菜单是否出现，以原生扩展和真实快照为准，不以 renderer 或 Electron 日志单独判断。
- Electron 里已经能执行，不等于 Finder 默认主线已经正确暴露该动作。
- 新动作不能只接通 dispatcher，还要同时接通 manifest、显隐规则、菜单快照和必要确认路径。

## 设计边界

- Finder 集成必须依赖原生 Finder Sync Extension，Electron 不能直接替代 Finder API。
- Host 与 Extension 必须使用同一个 `app group` / shared container；配置错误时显式失败，不允许静默 fallback。
- `manifest/actions.json` 是动作元数据唯一真相源；TS 与 Swift 都消费生成产物。
- 新动作必须通过 action registry / manifest 接入，不要散落在条件分支中。
- 任何写入或破坏性行为都必须有确认路径。

## AI / CLI 约束

- 当前默认主线是 CLI-only honest mode：`ai.ask-claude` 依赖 `claude`，`ai.ask-codex` 依赖 `codex`。
- CLI 缺失时必须明确报错，不允许静默失败；API 配置当前不参与 AI 动作显隐和执行。
- 默认交互是 `右键动作 -> 轻量 Prompt -> 等待执行 -> Result 展示结果`，不把 U-Right 做成通用聊天工作台。
- 长时、多轮、项目级任务应升级到外部 `Claude` / `Codex`。
- Result 窗口必须能承接等待态、错误态、复制、保存，以及按条件回写。

完整动作状态见 [action-implementation-status.md](./action-implementation-status.md)。历史材料入口见 [../archive/docs/README.md](../archive/docs/README.md)。
