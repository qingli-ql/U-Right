# U-Right 项目进度

这份文档记录当前项目的真实进度：已经完成了什么、哪些功能只是部分打通、哪些还没做，以及接下来建议按什么顺序继续推进。

更新时间：2026-04-01

## 当前总体状态

项目已经从“概念骨架”进入到“可运行原型”阶段，最关键的系统链路已经打通：

- 原生 `U-Right.app` 与 Electron Host 两条宿主链路都已可构建
- `Finder Sync Extension` 已可被系统识别、注册并在 Finder 中显示菜单
- Host / Extension / Shared 三层结构已经建立，并开始向“原生扩展 + Electron 宿主”收敛
- 一批核心菜单动作已经有实现
- Claude / Codex 基础链路已接入
- 日常开发入口已经收敛为一键 `make dev`
- `Copy Path` 与 `Open in VS Code` 在 Electron 主链路上已恢复可用
- Dock 图标与菜单栏图标已经开始统一到 `AppIcon.appiconset`

但整体仍然是 **MVP 原型阶段**，还没有达到“完整产品可发布”的程度。

## 已完成

### 1. 工程与系统集成

- 已建立 `URight.xcodeproj`
- 已建立两个原生 target：
  - `URightHostApp`
  - `URightFinderSync`
- 已建立 `electron/` 宿主工程：
  - Electron Main
  - React Renderer
  - Preload Bridge
- `Package.swift` 已收敛为只提供 `URightShared`
- Finder Sync 扩展已经是合法的 `Mach-O executable`
- `pluginkit` 已能识别 `com.openai.uright.findersync`
- Finder 中已经可以看到 `U-Right` 菜单
- `make dev` / `make dev-run` / `make electron-dev` 已统一为同一条开发链路

### 2. 模块边界

- `Sources/URightShared`
  - 常量、模型、设置、日志、模板、工具检测、动作注册表、handoff
- `Sources/URightHost`
  - 旧的原生宿主实现、设置窗口、日志窗口、AI 面板、动作调度
- `Sources/URightFinderExtension`
  - Finder 菜单生成、上下文采集、请求转发
- `electron/`
  - 新的宿主 UI 主线、请求监听、动作执行框架、设置/日志/结果窗口

### 3. Finder 菜单与上下文

- 已支持的上下文类型：
  - 单文件
  - 单目录
  - 多选
  - 空白区域 / 当前目录语义
- 已接入动态 `ActionRegistry`
- 菜单已按 context 生成，而不是完全散落的硬编码

### 4. 已有可工作的动作

当前代码里已经有实现或基本可用的动作包括：

- `New File...`
- `New Folder`
- 内置模板创建
- `Open in Terminal`
- `Open in Ghostty`
- `Open in iTerm`
- `Open in VS Code`
- `Open in Cursor`
- `Open in Zed`
- `Copy Path`
- `Copy Relative Path`
- `Copy Filename / Basename / Extension`
- `Reveal in Finder`
- `Duplicate`
- `Rename`
- `Move to Trash`
- `Compress`
- `Open Git Status Here`
- `Calculate SHA256`
- `Calculate MD5`
- `JSON Format`
- `Convert Line Endings`
- `Toggle Executable Bit`

这轮已额外确认并修通：

- `Copy Path`
- `Open in VS Code`

它们之前在 Electron 路径下失效的根因不是菜单生成，而是 Finder 传来的 `file://...` URL 在执行器里被误当成本地路径直接使用。

### 5. AI 基础能力

- 已有 AI 动作入口：
  - `Ask Claude About This`
  - `Ask Codex About This`
  - 以及一批预留 AI actions
- 已支持：
  - 文件上下文 prompt
  - 目录扫描摘要
  - 多选上下文聚合
  - 发送前 prompt 编辑
  - 结果窗口显示
  - Copy / Save / Apply to File / Open in Editor
- Provider 逻辑已接入：
  - Claude CLI 优先
  - Codex CLI 优先
  - OpenAI-compatible API fallback

### 6. 设置与日志

- 设置窗口已经存在
- 共享 JSON 持久化已接入
- Electron 与 Finder Extension 已围绕共享 JSON / 请求目录收口
- 日志写文件已接入
- 日志窗口已接入
- 模板目录与脚本目录的基础扫描逻辑已接入

### 7. Electron Host UI 主线已建立

- `Electron + TypeScript + React + Vite` 主线已接上
- Settings / Prompt / Result / Logs / Onboarding 已有统一 renderer
- `preload -> contextBridge -> renderer` 基础 bridge 已建立
- 主进程已开始接入窗口级加载与 console 诊断日志
- UI 已从早期黑色原型风切到浅色纸面风
- 窗口拖动区已通过自定义 chrome bar 接回
- Electron Dock 图标已切到 `Resources/App/Assets.xcassets/AppIcon.appiconset`
- Electron Tray 图标已开始复用同一套 `AppIcon` PNG 资源

### 8. 排障经验沉淀

- Finder Sync 排障记录已完成
- 已明确：
  - `File Provider` 和 `Finder Extensions` 不是一回事
  - `.appex` 必须是 executable，不能是 dylib
  - `pluginkit`、`file`、`codesign`、`log stream` 是首选排障工具
- Electron 侧也已新增经验：
  - 旧的 `vite` / `electron` / `wait-on` 进程会导致错误入口被复用
  - preload bridge 问题要优先排查运行入口是否一致
  - `make dev` 应作为当前开发主入口，而不是手工拼接旧命令
  - `dev-install` / `reload-extension` 的旧竞态已经通过脚本幂等化修复
  - Finder 传给 Electron 的路径字段是 `file://...` URL，不是天然可直接拿来 `spawn` 或拼接文件系统路径
  - `pkill -f` 按命令字符串匹配并不总可靠，开发清理脚本需要按 PID、按端口、按项目特征三层兜底
  - macOS 菜单栏图标和 Dock 图标不能偷懒复用“任意普通图”，最好统一挂在 `AppIcon.appiconset` 或专门的 template icon 资源上

相关文档：

- [finder-sync-debugging.md](/Users/qingli/Projects/agent_servers/claude-uright/docs/finder-sync-debugging.md)

## 部分完成

这些功能已经有骨架或部分实现，但还不能算完整交付。

### 1. 设置体验

- 设置窗口已经有基础 UI
- 视觉风格已进入第二版，但信息架构仍偏原型
- Launch at Login、扩展状态展示、可执行路径测试等还未做完整闭环

### 2. AI 结果体验

- 已有结果窗口
- 但 Markdown 渲染、代码块高亮、流式体验、错误提示细节还需要加强
- CLI 参数策略仍偏 MVP，未针对 Claude / Codex CLI 做更细粒度兼容

### 3. Finder 空白区域语义

- 当前实现已经能提供空白区域/当前目录语义
- 但仍需要真机下进一步确认在不同 Finder 窗口样式中的稳定性

### 4. Git / 脚本 / 模板扩展性

- 基础入口有了
- 但 Git GUI、脚本发现、用户模板管理还没做到成熟产品级体验

### 5. 构建链路

- `xcodebuild` 主链路已经可以成功构建
- Finder 扩展安装、重载、Electron 开发宿主启动已经收敛到 `make dev`
- 原生宿主仍保留为兼容/对照路径，但不再是默认开发入口
- 打包后 Electron app 与原生宿主的正式嵌入链路还未完成

## 未完成

以下需求仍未实现，或者仅停留在菜单声明层。

### 1. 菜单功能未完全落地

虽然 `ActionRegistry` 里声明了很多菜单项，但并非全部都已有真实实现。  
典型未完全落地项包括：

- `Show Hidden Files Here`
- `Refresh Finder Window` 的产品级实现
- `Open With...` 的完整系统集成
- `Batch Rename...`
- `Move All to Trash` 的批量体验优化
- `Search in Folder` 的独立原生搜索体验
- `Folder Size` / `Count Items` 的更强反馈
- `Toggle Hidden Files for This Folder Session`

### 2. AI 高级动作未完整实现

菜单里已有很多 AI action id，但不少还只是共用 prompt 路径，未形成真正定制逻辑：

- `Explain This Project`
- `Generate README`
- `Generate .gitignore`
- `Review Code`
- `Refactor This File`
- `Write Tests For This`
- `Explain Error Log`
- `Convert to JSON Schema`
- `Draft Commit Message`
- `Draft PR Summary`
- `AI Summarize Selection`
- `AI Ask About Selection`

这些动作目前更接近“通用 AI 调用入口”，还没有做到高质量差异化实现。

### 3. 原生 UI 细节未打磨

- 新文件输入面板仍是 `NSAlert` 风格，不是更精致的无边框小面板
- 设置页和结果页已有视觉升级，但离完整产品语言还差一轮收敛
- 危险操作确认流程还可以更一致
- 图标体系、品牌视觉、组件统一性仍需打磨
- 当前顶部状态栏图标虽然已切到应用图标资源，但还不是更适合 macOS 菜单栏的单色 template 版本

### 4. 发布级签名与分发

- 当前主要是本地 `Sign to Run Locally` / ad-hoc 路径
- 还没有完成：
  - Developer ID 签名
  - notarization
  - staple
  - 发布包校验

### 5. 自动化验证不足

- 当前以人工验证为主
- 缺少系统化测试矩阵
- 还没有：
  - 单元测试
  - 集成测试
  - Finder 上下文回归脚本
  - AI CLI / API fallback 自动化校验

## 当前真实风险

### 1. README 与旧脚本仍可能误导

虽然主线入口已经收敛为 `make dev`，但仓库里仍保留原生宿主与历史命令说明，初次进入项目的人仍可能被旧路径干扰。

### 2. 多份同 bundle id 副本会干扰调试

如果：

- `/Applications/U-Right.app`
- `build/DerivedData/.../U-Right.app`
- `build/xcode/Debug/U-Right.app`

同时存在并被注册，调试时很容易混淆 Finder 实际加载的是哪一份。

### 3. Electron 多进程开发环境容易残留旧状态

如果旧的：

- `vite --config electron/vite.config.ts`
- `wait-on`
- `electron electron/dist/main/...`

进程没有清干净，新的窗口可能会连到旧 renderer / 旧 main 入口，表现为：

- bridge 丢失
- 页面黑屏
- UI 与代码不一致

当前已经把清理逻辑收进 `scripts/dev_electron.sh`，但这仍然是一个需要持续警惕的风险点。

### 4. Finder URL 与本地路径语义容易混淆

Finder 扩展写入到请求目录里的上下文字段，在 Electron 看见的是 `file://...` URL。  
如果执行器直接把它们当本地路径：

- `Copy Path` 会复制出错误格式
- `Open in VS Code` / `Open in Cursor` 一类动作会把错误参数传给外部程序
- 创建文件、创建目录等动作也可能拼出错误路径

当前已经在 Electron 执行器里补了统一转换，但后续新增动作仍要优先复用这层路径归一化。

### 5. 功能声明多于实际完成度

当前菜单定义覆盖面很广，但真正完全走通的功能只占其中一部分。  
这意味着接下来需要做一次“菜单声明 vs 实际实现”的收敛，避免 UI 过度承诺。

## 下一步建议

建议按下面顺序推进，收益最高。

### Phase 1：统一构建与安装路径

- Makefile 已统一切到 `xcodebuild`
- README 构建说明已统一切到 Xcode 主路径
- `make dev` / `make dev-run` / `make electron-dev` 已统一到 `scripts/dev_electron.sh`
- 当前 `make dev` 会：
  - 安装 `/Applications/U-Right.app`
  - reload Finder Extension
  - 清理旧 Electron dev 进程和占用 5187 的残留 watcher
  - 启动当前 Electron 主进程与 renderer
- 下一步仍建议把旧路径说明继续降权，并减少重复副本残留

### Phase 2：收敛菜单承诺

- 逐项核对 `ActionRegistry` 中所有 action
- 标记为：
  - 已完成
  - 部分完成
  - 未实现
- 未实现项要么补实现，要么先从菜单中隐藏

### Phase 3：打磨最核心 MVP

优先把这些功能做到稳定可演示：

- New File / New Folder
- Open in Terminal / Ghostty / VS Code / Cursor / Zed
- Copy Path
- Move to Trash
- Settings 主首页信息架构收敛
- Prompt / Result / Logs 的统一品牌与视觉语言
- Electron bridge 与错误提示再增强一轮
- Ask Claude About This
- Ask Codex About This
- Settings 持久化
- 日志查看

### Phase 4：补强 AI 动作质量

- 为不同 AI action 定制 prompt 模板
- 细化 Claude / Codex CLI 调用策略
- 优化流式输出与结果展示
- 完善 Apply to File 的安全确认

### Phase 5：发布链路

- Developer ID 签名
- notarization
- staple
- Release Makefile / 文档

## 里程碑判断

### 当前所处阶段

`系统链路已打通，MVP 功能部分可用，正处于原型收敛阶段`

### 到下一个里程碑的标准

满足以下条件后，可以认为进入“可稳定演示版本”：

- Finder 菜单稳定出现
- 只保留一个权威 app 构建/安装路径
- 最核心 6 到 8 个动作稳定可用
- Claude / Codex 至少一条 CLI 路径稳定
- README 与实际行为一致
