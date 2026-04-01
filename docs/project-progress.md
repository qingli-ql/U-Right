# U-Right 项目进度

这份文档记录当前项目的真实进度：已经完成了什么、哪些功能只是部分打通、哪些还没做，以及接下来建议按什么顺序继续推进。

更新时间：2026-04-01

## 当前总体状态

项目已经从“概念骨架”进入到“可运行原型”阶段，最关键的系统链路已经打通：

- 原生 `U-Right.app` 菜单栏宿主已可构建
- `Finder Sync Extension` 已可被系统识别、注册并在 Finder 中显示菜单
- Host / Extension / Shared 三层结构已经建立
- 一批核心菜单动作已经有实现
- Claude / Codex 基础链路已接入

但整体仍然是 **MVP 原型阶段**，还没有达到“完整产品可发布”的程度。

## 已完成

### 1. 工程与系统集成

- 已建立 `URight.xcodeproj`
- 已建立两个原生 target：
  - `URightHostApp`
  - `URightFinderSync`
- `Package.swift` 已收敛为只提供 `URightShared`
- Finder Sync 扩展已经是合法的 `Mach-O executable`
- `pluginkit` 已能识别 `com.openai.uright.findersync`
- Finder 中已经可以看到 `U-Right` 菜单

### 2. 模块边界

- `Sources/URightShared`
  - 常量、模型、设置、日志、模板、工具检测、动作注册表、handoff
- `Sources/URightHost`
  - 菜单栏宿主、设置窗口、日志窗口、AI 面板、动作调度
- `Sources/URightFinderExtension`
  - Finder 菜单生成、上下文采集、请求转发

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
- `App Group UserDefaults` 持久化已接入
- 日志写文件已接入
- 日志窗口已接入
- 模板目录与脚本目录的基础扫描逻辑已接入

### 7. 排障经验沉淀

- Finder Sync 排障记录已完成
- 已明确：
  - `File Provider` 和 `Finder Extensions` 不是一回事
  - `.appex` 必须是 executable，不能是 dylib
  - `pluginkit`、`file`、`codesign`、`log stream` 是首选排障工具

相关文档：

- [finder-sync-debugging.md](/Users/qingli/Projects/agent_servers/claude-uright/docs/finder-sync-debugging.md)

## 部分完成

这些功能已经有骨架或部分实现，但还不能算完整交付。

### 1. 设置体验

- 设置窗口已经有基础 UI
- 但还比较原型化，距离“polished native settings”还有差距
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
- 但仓库里仍保留了旧的手工打包脚本路径，容易混淆
- Makefile 与 README 还需要进一步统一到 Xcode 主路径

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
- 设置页和结果页仍偏工程原型
- 危险操作确认流程还可以更一致
- 深色模式 / 视觉层次 / 图标细节仍需打磨

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

仓库中仍存在旧的手工构建/打包路径描述，容易让人再次运行到旧产物。

### 2. 多份同 bundle id 副本会干扰调试

如果：

- `/Applications/U-Right.app`
- `build/DerivedData/.../U-Right.app`
- `build/xcode/Debug/U-Right.app`

同时存在并被注册，调试时很容易混淆 Finder 实际加载的是哪一份。

### 3. 功能声明多于实际完成度

当前菜单定义覆盖面很广，但真正完全走通的功能只占其中一部分。  
这意味着接下来需要做一次“菜单声明 vs 实际实现”的收敛，避免 UI 过度承诺。

## 下一步建议

建议按下面顺序推进，收益最高。

### Phase 1：统一构建与安装路径

- Makefile 已统一切到 `xcodebuild`
- README 构建说明已统一切到 Xcode 主路径
- `make run` 已统一为“先安装，再打开 `/Applications/U-Right.app`”
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
