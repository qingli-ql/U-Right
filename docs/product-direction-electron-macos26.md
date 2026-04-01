# 产品方向更新：Electron + macOS 26

这份文档把产品方向更新为“最省事版本”，也就是：

- Electron
- TypeScript
- React
- Vite
- `@electron-forge/cli`
- `@electron-forge/plugin-vite`
- `electron-builder`
- `electron-store`
- `vitest`
- `playwright`
- `@sentry/electron`

但有一个非常关键的现实约束要先说清楚：

这个产品如果还要保留 Finder 超级右键能力，就不能是“纯 Electron App”。  
原因不是工程习惯，而是 Apple 的 Finder 集成能力本身来自 Finder Sync 扩展点，它要求一个原生的 App Extension，核心类是 `FIFinderSync`，并且扩展 target 需要 `com.apple.FinderSync` 这一扩展点配置。[Apple Finder Sync](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Finder.html)

所以，最省事且现实可行的版本，不是“全部换成 Electron”，而是：

## 1. 最推荐的产品架构

### 结论

采用混合架构：

- Electron Host App
  - 菜单栏 UI
  - Settings
  - AI Prompt / 结果窗口
  - 日志窗口
  - 模板管理
  - 工具检测与 AI 调用

- Native Finder Bridge
  - Finder Sync Extension
  - 少量原生桥接代码
  - 负责从 Finder 收集上下文，并把任务转发给 Electron Host

- Shared Integration Layer
  - Action Schema
  - Context Schema
  - Settings Schema
  - IPC 协议
  - 日志字段约定

### 为什么这是“最省事版本”

因为：

1. UI、设置、AI 面板、日志这些复杂界面用 Electron + React 会比纯 AppKit 快很多。
2. Finder 右键菜单这件事仍交给 Apple 官方支持的原生扩展机制。
3. 复杂逻辑集中在 Electron，原生部分尽量薄，后续维护成本最低。

---

## 2. 非常关键的现实判断

### 2.1 纯 Electron 不能直接实现 Finder Sync

这是我根据 Apple 官方 Finder Sync 文档做出的直接推论：

- Finder Sync 是 macOS 原生 App Extension 机制
- 需要 `FIFinderSync` 子类
- 需要 `NSExtensionPointIdentifier = com.apple.FinderSync`
- 需要原生扩展 bundle 被系统识别并加载

这意味着 Electron 适合做宿主 App，但 Finder 集成部分仍必须是原生 target。[Apple Finder Sync](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Finder.html)

### 2.2 Finder Sync 本身也有产品边界

Apple 官方文档明确提醒：Finder Sync 更适合做“受监控目录”的同步类体验，并不是一个泛化的 Finder UI 魔改框架。[Apple Finder Sync](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Finder.html)

这对我们有两个重要影响：

- 最稳的第一版，应该先围绕“用户配置的工作目录 / 项目目录”做超级右键
- “系统任意目录全覆盖”的目标要作为后续验证项，不要一开始就假定 100% 无限制成立

这是当前产品方向里最需要提前接受的系统约束。

---

## 3. 技术栈怎么落

### 3.1 前端与桌面壳

推荐主栈：

- Electron
- TypeScript
- React
- Vite
- `@electron-forge/cli`
- `@electron-forge/plugin-vite`

Electron 官方分发文档明确写着：打包与分发工具里，他们推荐使用 Electron Forge。[Electron Application Packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution/)

### 3.2 本地存储

推荐：

- `electron-store`

用途：

- 用户设置
- 最近动作
- 收藏动作
- 自定义模板目录
- Claude/Codex 路径配置
- Sentry 开关

### 3.3 测试

推荐：

- `vitest`
  - 纯逻辑、schema、action registry、prompt builder、路径处理
- `playwright`
  - Electron 窗口级交互、设置页、AI 结果页、面板交互

### 3.4 错误监控

推荐：

- `@sentry/electron`

用途：

- 主进程异常
- 渲染进程崩溃
- 原生桥接调用失败的结构化记录

### 3.5 打包与发布

你列了 `@electron-forge/cli` 和 `electron-builder`，但这里有个很重要的取舍：

- 最省事的日常开发工具：`Electron Forge + Vite plugin`
- 如果一定要更成熟的 DMG/ZIP 发布流程：再引入 `electron-builder`

我建议：

- 开发期以 Forge 为主
- 发布期再决定是否引入 `electron-builder`

原因是两者在“打包职责”上有重叠。  
如果你现在目标是尽快把产品做出来，先别让两个打包体系同时成为主路径。

这是我的工程判断，不是 Electron 官方硬性要求。  
官方能明确确认的是：Electron 推荐 Forge 作为主要打包分发工具。[Electron Application Packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution/)

---

## 4. macOS 26 上，API 和权限层面最关键的结论

### 4.1 Finder Sync 相关 API 没有看到官方“全新替代接口”

我查到的 Apple 官方资料里，Finder Sync 的核心仍然是：

- `FIFinderSync`
- `FIFinderSyncController`
- `menuForMenuKind:`
- `targetedURL`
- `selectedItemURLs`
- App Groups 共享配置

Finder Sync 文档仍然说明：

- 容器 App 和扩展应通过 App Group 共享配置
- 扩展应该保持轻量
- 复杂工作应交给单独服务或宿主承担

这和我们当前“原生扩展 + Electron Host”的方向是吻合的。[Apple Finder Sync](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Finder.html)

我的判断是：

- 对 macOS 26 来说，Finder Sync 的开发思路没有出现“你必须改写为另一套公开新 API”的明确信号
- 但它本身仍然是一个历史较久、系统边界较硬的扩展点，所以一定要早做真机验证

这里最后一句是基于文档与现状的工程推断。

### 4.2 App Sandbox 机制依然是 entitlement 驱动

Apple 当前官方文档仍然强调：

- App Sandbox 会限制文件系统、网络和硬件访问
- 需要通过 entitlements 声明访问意图
- 用户选择文件可以通过 Open/Save 面板获得访问权

这说明到了 macOS 26，权限模型核心仍然是 entitlement + TCC，而不是出现了一个新的“统一权限 API”。[App Sandbox Overview](https://developer.apple.com/documentation/xcode/configuring-the-macos-app-sandbox/) [App Sandbox](https://developer.apple.com/documentation/security/app-sandbox)

### 4.3 对这个产品，最推荐的发布策略是“非 MAS、签名 + 公证”，不要先上沙盒

这是整个方向里最重要的产品决策之一。

原因：

- 你这个工具本质上要做文件管理、打开终端、打开编辑器、调用本地 CLI、和 Finder 扩展协作
- 如果一开始就走强沙盒路线，文件访问、CLI 调用、外部应用拉起都会更麻烦
- Electron 在 MAS 沙盒场景下虽然可以配合 security-scoped bookmarks，但那更适合“用户从对话框显式选择文件”的模型
- 你的产品核心使用场景是“从 Finder 右键直接作用于现有路径”，和 MAS 沙盒模型天然张力很大

Electron 官方文档说明：

- macOS 发布需要 code signing
- 然后做 notarization

这是你外部分发的标准路径。[Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)

我的建议：

- 第一版：Developer ID 签名 + notarization + 非沙盒发布
- 以后如果有 Mac App Store 诉求，再单独评估 MAS 兼容版本

这是工程建议，不是 Apple 官方强制路线。

### 4.4 Electron 侧现成可用的权限相关 API

Electron 目前在 macOS 上明确提供了这些能力：

- `systemPreferences.isTrustedAccessibilityClient(prompt)`
  - 用来检查/提示辅助功能授权
- `systemPreferences.getMediaAccessStatus(mediaType)`
  - 查询 `microphone` / `camera` / `screen`
- `systemPreferences.askForMediaAccess(mediaType)`
  - 请求 `microphone` / `camera`
- `app.setLoginItemSettings(...)`
  - 控制开机启动；在 macOS 13+ 支持 `mainAppService` 等服务类型

对应官方文档：

- Electron `systemPreferences` 文档列出了无障碍与媒体权限接口
- Electron `app` 文档列出了 Login Item 相关能力

[Electron systemPreferences](https://www.electronjs.org/zh/docs/latest/api/system-preferences) [Electron app](https://www.electronjs.org/docs/latest/api/app)

对你这个产品的实际意义是：

- 如果只做 Finder 右键、文件操作、打开终端/编辑器，通常不需要额外请求麦克风/摄像头/屏幕权限
- 如果未来加“屏幕截图解释错误”或“录屏辅助 AI”之类功能，才需要再接 screen / camera / microphone 权限流
- 如果未来走 Accessibility 自动化方案，才需要 `isTrustedAccessibilityClient`

### 4.5 如果以后做 MAS 版本，Electron 有 security-scoped bookmarks 支持

Electron 官方文档明确支持：

- `dialog.showOpenDialog({ securityScopedBookmarks: true })`
- `app.startAccessingSecurityScopedResource(bookmark)`

但官方也写得很清楚，这套是给 `macOS MAS` 包使用的。[Electron dialog](https://www.electronjs.org/docs/latest/api/dialog) [Electron app](https://www.electronjs.org/docs/latest/api/app/)

所以结论非常直接：

- 非 MAS 第一版，不把它当核心路径
- MAS 兼容时，再把它纳入文件访问方案

### 4.6 通知权限和登录项 API 仍然值得接入

Electron `app` 文档提到：

- badge/通知相关能力在 macOS 上需要应用具备显示通知权限
- `app.setLoginItemSettings` 在 macOS 13+ 有新的 service type 选项

这对你的工具类 App 是实用的：

- 通知：用来提示 AI 动作完成、构建完成、脚本结束
- Login Item：用来做菜单栏常驻、自启动

[Electron app](https://www.electronjs.org/docs/latest/api/app)

---

## 5. 这次产品更新后，建议的工程结构

```text
project/
├── apps/
│   ├── desktop-electron/
│   │   ├── src/main/
│   │   ├── src/preload/
│   │   ├── src/renderer/
│   │   ├── forge.config.ts
│   │   ├── electron-builder.yml        # 如果后期确认要保留 builder
│   │   └── package.json
│   └── finder-bridge-native/
│       ├── FinderBridgeHost.xcodeproj
│       ├── HostBridgeApp/
│       ├── FinderSyncExtension/
│       └── SharedBridge/
├── packages/
│   ├── shared-schema/
│   ├── action-registry/
│   ├── ai-context/
│   └── ui-contracts/
└── docs/
    ├── claude-code-project-setup-guide.md
    └── product-direction-electron-macos26.md
```

### 为什么这样拆

- Electron 项目负责 UI 和应用体验
- Xcode 原生项目负责 Finder 扩展与系统集成
- `packages/` 负责协议、schema、动作定义，避免 Host 和桥接层各写一套

---

## 6. 最省事版本的开发优先级

### 第一阶段：先把能跑通的链路做出来

1. Electron Host App 跑起来
2. React 设置页跑起来
3. Native Finder Sync Extension 跑起来
4. Finder 右键能把上下文发送给 Host
5. Host 能展示一个原生风格结果窗口

### 第二阶段：再做核心动作

1. Copy Path
2. Open in Terminal
3. Open in VS Code / Cursor
4. New File
5. Ask Claude About This
6. Ask Codex About This

### 第三阶段：再做打磨

1. 模板系统
2. Recent / Pinned Actions
3. 日志窗口
4. Sentry
5. 签名、公证、安装引导

---

## 7. 最关键的权限与系统集成建议

### 第一版建议

- Outside Mac App Store
- Developer ID 签名
- Hardened Runtime
- Notarization
- 不默认启用 App Sandbox

理由：

- 文件管理工具 + Finder 右键 + 本地 CLI 调用，是一个明显更适合非沙盒分发的组合
- 这样更贴近“工具类 App、AI 客户端、聊天壳、文件管理类工具”的典型 Electron 路线

### 需要重点验证的系统能力

- Finder Sync Extension 是否能稳定加载
- 扩展启用引导是否清晰
- Host 与扩展的 IPC 是否稳定
- 从 Finder 传入的路径在 Host 端是否可直接使用
- 打开终端、编辑器、本地 CLI 时是否被系统策略拦截

---

## 8. 对你这个产品，最重要的 5 个判断

1. UI 技术栈完全可以改成 Electron + React，这会明显降低主界面开发成本。
2. Finder 超级右键能力不能纯靠 Electron，必须保留原生 Finder Sync 扩展桥。
3. 第一版最好走“非 MAS、签名 + 公证、不沙盒”的工具型产品路线。
4. macOS 26 没看到要求你改用全新权限 API 的官方信号，主线仍是 Finder Sync + App Groups + entitlement/TCC。
5. 真正的风险不在 React 或 Electron，而在 Finder 扩展加载、原生桥接、签名和发布链路。

---

## 9. 参考资料

- [Apple Finder Sync 文档](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Finder.html)
- [Apple App Sandbox 文档](https://developer.apple.com/documentation/security/app-sandbox)
- [Apple 配置 macOS App Sandbox](https://developer.apple.com/documentation/xcode/configuring-the-macos-app-sandbox/)
- [Apple macOS 支持的 capabilities](https://developer.apple.com/help/account/reference/supported-capabilities-macos)
- [Electron Application Packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution/)
- [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [Electron systemPreferences](https://www.electronjs.org/zh/docs/latest/api/system-preferences)
- [Electron app](https://www.electronjs.org/docs/latest/api/app)
- [Electron dialog](https://www.electronjs.org/docs/latest/api/dialog)

补充说明：

- 我还看了一个 Apple Developer Forums 的 macOS 26.1 Finder Sync 帖子。DTS 回复指向的是扩展实现/配置问题，而不是 Apple 已确认的 Finder Sync 公共 API 变更，所以我没有把它当成“官方 API 已变化”的结论来源，只把它视为真机验证必要性的提醒。[Apple Developer Forums](https://developer.apple.com/forums/thread/806607)
