# U-Right

U-Right 是一个基于 Swift / AppKit / FinderSync 的 macOS 14+ Finder “super right-click” 工具。工程按 `Host App`、`Finder Sync Extension`、`Shared` 三层划分，主目标是让菜单栏宿主、Finder 扩展、AI 动作、模板创建与外部工具集成先真正跑起来。

## 当前结构

- `Package.swift`：Swift Package 根定义
- `Sources/URightShared`：动作注册表、共享模型、设置、日志、模板、工具检测、Handoff
- `Sources/URightHost`：菜单栏宿主、设置窗口、日志窗口、AI 面板、动作调度
- `Sources/URightFinderExtension`：Finder Sync Extension 菜单生成与请求转发
- `Resources/App`：宿主 App 的 `Info.plist` 与 entitlements
- `Resources/Extension`：Finder 扩展的 `Info.plist` 与 entitlements
- `scripts`：打包、运行、安装脚本

## 构建

```bash
swift build
make build CONFIG=debug
make build CONFIG=release
```

产物会生成到：

- `build/debug/U-Right.app`
- `build/release/U-Right.app`

脚本会把 Finder Sync `.appex` 嵌入到宿主 `.app` 中，并使用 ad-hoc 签名：

```bash
codesign --force --deep --sign - ...
```

> 这里采用**非 App Store 沙盒优先**的本地工具路线，以保证 Finder 文件操作、外部终端/编辑器拉起、Claude/Codex CLI 调用更稳定。扩展与宿主仍通过 App Group 共享设置与请求。

## 运行

```bash
make run
```

## 安装

```bash
make install
```

会复制到：`/Applications/U-Right.app`

## 启用 Finder Extension

1. 启动 `U-Right.app`
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
