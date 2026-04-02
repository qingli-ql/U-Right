# U-Right

U-Right 是一个面向 macOS Finder 的 “super right-click” 工具。当前产品方向已经收敛为：

- 原生 `Finder Sync Extension` 负责采集 Finder 上下文、生成菜单、转发请求
- `Electron + TypeScript + React + Vite` 负责宿主 UI、设置、日志、Prompt、结果窗口与后续复杂工作流
- `Shared` 层负责动作注册表、共享模型、设置、日志、模板、工具检测与 handoff 协议

仓库里仍保留旧的原生 AppKit Host 作为兼容 / 对照实现，但**当前默认开发主线是 Electron Host，不是原生 Host**。

Finder 扩展排障记录见：

- [docs/finder-sync-debugging.md](/Users/qingli/Projects/agent_servers/claude-uright/docs/finder-sync-debugging.md)

项目当前进度见：

- [docs/project-progress.md](/Users/qingli/Projects/agent_servers/claude-uright/docs/project-progress.md)

动作实现状态见：

- [docs/action-implementation-status.md](/Users/qingli/Projects/agent_servers/claude-uright/docs/action-implementation-status.md)

发布链路清单见：

- [docs/release-checklist.md](/Users/qingli/Projects/agent_servers/claude-uright/docs/release-checklist.md)

## 当前结构

- `Package.swift`：只提供 `URightShared`
- `Sources/URightShared`：动作注册表、共享模型、设置、日志、模板、工具检测、Handoff
- `Sources/URightHost`：旧的原生宿主实现，作为兼容 / 对照路径保留
- `Sources/URightFinderExtension`：Finder Sync Extension 菜单生成与请求转发
- `electron/`：当前默认宿主主线，包含 Electron Main、Preload、React Renderer
- `Resources/App`：宿主 App 的 `Info.plist` 与 entitlements
- `Resources/Extension`：Finder 扩展的 `Info.plist` 与 entitlements
- `scripts`：打包、运行、安装脚本

## 构建

当前唯一推荐的构建路径是 **Xcode 工程**。  
不要再把旧的 SwiftPM-only / 手工拼 `.appex` 路径当成主路径。

```bash
make build CONFIG=Debug
make build CONFIG=Release
```

如果要真正加载 Finder Extension，当前推荐直接走一键开发入口：

```bash
make dev
```

`make dev` / `make run` / `make dev-run` / `make electron-dev` 当前都统一到 `scripts/dev_electron.sh`，会自动：

- 以开发签名优先构建并安装 `/Applications/U-Right.app`
- 刷新并重新启用 Finder Extension
- 写入 App Group 下的 dev host marker，避免扩展动作再次唤醒安装版 Host
- 清理残留 Electron dev 进程与 5187 端口占用
- 启动当前 Electron main / renderer

如果只想单独执行构建或安装，也可以用：

```bash
make team-id
make app-group-id
make dev-build CONFIG=Debug
make dev-install CONFIG=Debug
make reload-extension
```

`dev-build` / `dev-install` / `dev-run` / `dev` 默认会带上 `ALLOW_PROVISIONING_UPDATES=1`，允许 `xcodebuild` 为你的个人 Team 自动创建或更新本地开发 profile。
如果当前机器没有可用的 Xcode 账号或 `Mac Development` 证书，脚本会自动回退到无签名本地构建，保证开发调试不断线。
现在也会优先回退到本地 ad-hoc 签名（`Sign to Run Locally`），再不行才回退到无签名构建。
`make dev-build` 是严格模式：会关闭这些回退，让 entitlement 或 Team 签名问题直接暴露出来。

`make build` 默认只做构建。  
`make install` 负责把构建产物复制到 `/Applications/U-Right.app`。  
`make run` 现在已经不是“只打开本地构建产物”的旧语义，而是 **Electron 开发主线入口**，行为与 `make dev` 一致。  
只有 `dev*` 路径才会优先尝试用 Team 签名。

`dev-*` 脚本会按以下优先级获取 `DEVELOPMENT_TEAM`：

1. 当前 shell 环境变量 `DEVELOPMENT_TEAM`
2. `~/.config/uright/dev.env` 里的 `DEVELOPMENT_TEAM=...`
3. 本机钥匙串中第一条 `Apple Development` 身份

可选的本地配置文件示例：

```bash
mkdir -p ~/.config/uright
cat > ~/.config/uright/dev.env <<'EOF'
DEVELOPMENT_TEAM=G33RR3NYNY
ALLOW_PROVISIONING_UPDATES=1
EOF
```

产物会生成到：

- `build/xcode/Debug/U-Right.app`
- `build/xcode/Release/U-Right.app`

底层实际调用的是：

```bash
xcodebuild -project URight.xcodeproj -scheme URightHostApp ...
```

未设置 `DEVELOPMENT_TEAM` 时，`make build` 会执行**无签名构建**，只用于编译验证；这种构建不会让 Finder Extension 被系统加载。  
设置 `DEVELOPMENT_TEAM` 后，扩展由 Xcode 原生嵌入宿主 `.app`。  
这里采用**非 App Store 沙盒优先**的本地工具路线，以保证 Finder 文件操作、外部终端/编辑器拉起、Claude/Codex CLI 调用更稳定。扩展与宿主仍通过 App Group 共享设置与请求。
当前默认共享组会根据 `DEVELOPMENT_TEAM` 动态计算为 `<TEAM_ID>.uright.shared`；可通过 `make app-group-id` 查看。

## 推荐入口

日常开发默认只看下面三个命令：

```bash
make dev
make build CONFIG=Debug
make install CONFIG=Debug
```

- `make dev`：默认开发入口，安装 app、刷新扩展、启动 Electron Host
- `make build`：仅构建 Xcode 工程
- `make install`：把当前构建安装到 `/Applications/U-Right.app`

## 运行

```bash
make run
```

`make run` 当前与 `make dev` 等价，会统一走：

- `/Applications/U-Right.app`

这样可以确保：

- Finder 实际加载的扩展与当前开发入口指向同一份安装版 app
- 避免 Electron dev Host 与安装版原生 Host 同时被拉起
- Electron 主进程和 renderer 使用的是同一轮启动出来的 dev 环境

如果你更习惯旧命名，下面两个 Make target 与 `make dev` 等价：

```bash
make dev-run
make electron-dev
```

只有在你已经手动完成安装与扩展刷新时，才建议直接运行：

```bash
npm run electron:dev
```

它只负责启动 Electron dev 进程，**不会**替你安装 app 或刷新 Finder Extension。

如果你还想临时启动旧的原生 AppKit 宿主做对照或排障，可使用：

```bash
make native-dev-run
```

## 安装

```bash
make install CONFIG=Release
```

会复制到：`/Applications/U-Right.app`

建议只保留这一份安装版用于 Finder 扩展验证，避免多个同 bundle id 副本干扰 `pluginkit` 和 Finder 加载。

## 启用 Finder Extension

1. 执行 `make dev`
2. 打开系统设置 → Privacy & Security → Extensions → Finder Extensions
3. 启用 `U-Right Finder Sync`
4. 如 Finder 菜单未刷新，可执行：

```bash
make open-extension-settings
killall Finder
```

## AI 配置

在菜单栏 → `Settings` 中可配置：

- 优先使用 `claude` / `codex` CLI
- OpenAI-compatible API Base URL / API Key / Model
- 系统提示词、最大文件大小、目录扫描深度、是否包含隐藏文件

当前策略：

- `Ask Claude About This`：优先本地 `claude`
- `Ask Codex About This`：优先本地 `codex`
- 其他 AI 动作按设置的 provider / auto 决策
- CLI 不存在时回退到 API
- 发送前弹出原生提示词编辑面板
- 结果显示在原生结果窗口，支持 Copy / Save / Apply to File / Open in Editor

## 模板与新建文件

支持右键目录 / 空白区域创建：

- Empty File
- Text / Markdown / JSON / Python / Shell / HTML / CSS / JS / TS
- `README.md`
- `.gitignore`
- `.env`

自定义模板目录在 `Settings > Templates` 中配置。

## 自定义动作 / 脚本

### 自定义模板

把模板文件放到自定义模板目录后，宿主读取其内容作为 starter content。

### 自定义脚本

脚本目录为 App Group 容器下的 `Scripts` 子目录。放入可执行脚本后，会自动出现在 Finder 菜单的 `Scripts` 子菜单中。

## 日志

日志文件：

- `~/Library/Group Containers/<make app-group-id>/uright.log`
- 如果当前进程拿不到 App Group 容器，会回退到 `~/Library/Application Support/U-Right/uright.log`

查看：

```bash
make tail-logs
make doctor
make dump-entitlements
```

或菜单栏 → `Logs`

## Dev Host 单实例规则

`make dev` 当前会同时涉及两类组件：

- Finder 实际加载的安装版 `/Applications/U-Right.app`
- Electron dev Host

为避免“右键一次，结果又唤醒另一个 Host”的双实例问题，当前规则是：

- `scripts/dev_electron.sh` 启动时会在 App Group 根目录写入 `dev-host-state.json`
- Finder Extension 检测到这个 marker 后，不再调用 `openApplication` 唤醒安装版 Host
- Electron dev Host 退出时会移除这个 marker

因此，日常开发时应优先使用：

```bash
make dev
```

不要在 `make dev` 已运行时再额外手工打开 `/Applications/U-Right.app` 做同一路径调试。

## 已实现重点

- 动态 Action Registry 菜单生成
- Finder file / folder / multi / empty context 区分
- 宿主与扩展通过 App Group + DistributedNotification Handoff 通信
- New File / New Folder / built-in templates
- Open in Terminal / Ghostty / iTerm / VS Code / Cursor / Zed
- Ask Claude / Ask Codex / API fallback
- 设置持久化（共享 `UserDefaults(suiteName:)`）
- 日志文件与日志窗口

## 后续增强建议

- 更精细的 Finder 空白区域/窗口级刷新与隐藏文件会话控制
- 更完整的 Open With / Quick Look / Batch Rename / Git GUI 体验
- 更强的 Markdown 渲染与代码块语义高亮
- 更严格的 Developer ID 签名与 notarization 流程
