# U-Right

U-Right 是一个基于 Swift / AppKit / FinderSync 的 macOS 14+ Finder “super right-click” 工具。工程按 `Host App`、`Finder Sync Extension`、`Shared` 三层划分，主目标是让菜单栏宿主、Finder 扩展、AI 动作、模板创建与外部工具集成先真正跑起来。

Finder 扩展排障记录见：

- [docs/finder-sync-debugging.md](/Users/qingli/Projects/agent_servers/claude-uright/docs/finder-sync-debugging.md)

项目当前进度见：

- [docs/project-progress.md](/Users/qingli/Projects/agent_servers/claude-uright/docs/project-progress.md)

## 当前结构

- `Package.swift`：Swift Package 根定义
- `Sources/URightShared`：动作注册表、共享模型、设置、日志、模板、工具检测、Handoff
- `Sources/URightHost`：菜单栏宿主、设置窗口、日志窗口、AI 面板、动作调度
- `Sources/URightFinderExtension`：Finder Sync Extension 菜单生成与请求转发
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

如果要真正加载 Finder Extension，当前推荐使用带开发签名的构建：

```bash
make team-id
make dev-build CONFIG=Debug
make dev-install CONFIG=Debug
make reload-extension
```

`dev-build` / `dev-install` / `dev-run` 默认会带上 `ALLOW_PROVISIONING_UPDATES=1`，允许 `xcodebuild` 为你的个人 Team 自动创建或更新本地开发 profile。
如果当前机器没有可用的 Xcode 账号或 `Mac Development` 证书，脚本会自动回退到无签名本地构建，保证开发调试不断线。
现在也会优先回退到本地 ad-hoc 签名（`Sign to Run Locally`），再不行才回退到无签名构建。

`make build` / `make install` / `make run` 默认不做签名，只用于本地编译验证。  
只有 `dev-*` 命令才会尝试用 Team 签名。

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

## 运行

```bash
make run
```

`make run` 现在会先执行安装，再统一打开：

- `/Applications/U-Right.app`

这样可以确保：

- 构建、安装、运行指向的是同一份 App
- 避免开发目录中的副本和安装目录中的副本同时存在，干扰 Finder Sync 扩展加载

现在推荐的一键开发入口是：

```bash
make dev
```

它会依次执行：

- 开发签名安装 `U-Right.app`
- 刷新并重新启用 Finder Sync Extension
- 启动 Electron 开发宿主

如果你更习惯旧命名，下面两个命令与 `make dev` 等价：

```bash
make dev-run
npm run electron:dev
```

其中 `make dev-run` / `make electron-dev` 会先把原生 Finder 扩展安装和刷新到位，再进入 Electron 开发模式；不需要再手动补 `make dev-install` 和 `make reload-extension`。

如果你还想临时启动旧的原生 AppKit 宿主，可使用：

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

- `~/Library/Application Support/U-Right/uright.log`

查看：

```bash
make tail-logs
```

或菜单栏 → `Logs`

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
