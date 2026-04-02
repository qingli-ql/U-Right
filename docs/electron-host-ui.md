# Electron Host UI

这个目录下的 Electron Host 是 U-Right 宿主 UI 的新主线实现：

- 技术栈：Electron + TypeScript + React + Vite
- 目标：接管 Settings / Prompt / Result / Logs / Onboarding
- 保留：原生 Finder Sync Extension 与共享动作模型

## 当前已落地

- `electron/` 工程骨架
- 共享 JSON 设置读写
- 请求目录监听与动作消费框架
- 浅色纸面风的 Settings 页面与统一顶栏
- Prompt / Result / Logs / Onboarding 首版窗口
- 统一的 `preload -> contextBridge -> renderer` bridge
- 顶部可拖动窗口 chrome bar
- Electron 窗口级日志，便于排查 preload / renderer 加载问题
- Dock / Tray 图标当前优先读取 `Resources/App/Assets.xcassets/AppIcon.appiconset/brand-source.svg`
- native `AppIcon.appiconset` 视为这份 SVG 的导出产物

## 当前推荐启动方式

当前开发期不再建议手工分别启动多套 Electron / Vite 进程。  
统一使用：

```bash
make dev
```

这条路径会做几件事：

- 安装最新的 `/Applications/U-Right.app`
- reload Finder Extension
- 写入 App Group 下的 `dev-host-state.json`，避免扩展动作再唤醒安装版 Host
- 清理旧的 Electron dev / Vite / wait-on / concurrently / electron 进程
- 再启动当前 Electron renderer 与主进程

这样可以避免旧入口、旧端口占用、旧构建残留导致的“窗口开了但实际不是当前代码”问题。
它也避免了 `make dev` 期间同时出现一个 Electron dev Host 和一个安装版原生 Host。

## 开发命令

```bash
make dev
```

如需单独前端开发，也仍可使用：

```bash
npm install
npm run electron:dev
```

但在仓库当前阶段，更推荐把它视为底层命令，而不是日常主入口。

## 构建命令

```bash
npm run electron:build
```

## 共享状态

Electron 与 Finder Extension 共享以下路径：

- 设置：`~/Library/Group Containers/<make app-group-id>/settings.json`
- 备份：`~/Library/Group Containers/<make app-group-id>/settings.backup.json`
- 请求目录：`~/Library/Group Containers/<make app-group-id>/Requests`

如果本机当前没有有效的 App Group 容器，Electron 会退回：

- `~/Library/Application Support/U-Right`

建议排障时先跑：

```bash
make app-group-id
make doctor
make dump-entitlements
```

除了设置、日志和请求目录外，开发模式还会使用：

- `~/Library/Group Containers/<make app-group-id>/dev-host-state.json`

这个文件只在 `make dev` 期间存在，用来告诉 Finder Extension：“当前已经有活跃的 Electron dev Host，不要再唤醒安装版 Host”。

## 当前迁移范围

已经迁移到 Electron 的重点是：

- Settings
- AI Prompt Composer
- AI Result Window
- Logs
- Onboarding

当前仍保留在原生侧或待继续迁移的：

- 原生菜单栏 Host 的完整收口
- 更多 Finder 动作的 Electron 执行器
- 打包后 Electron app 与原生宿主的正式嵌入链路
- 更适合菜单栏的单色 template tray icon

## 本轮排障结论

本轮 Electron 黑屏问题的直接表现是：

- renderer 中访问 `window.uright.getWindowContext()` 报错
- 页面退化为 bridge unavailable

已确认的根因与修复方向：

- 根因不是 `Settings` 组件本身，而是 preload bridge 没有成功进入 renderer
- 历史遗留的旧 `vite` / `wait-on` / `electron` 进程会让窗口连到错误入口
- `BrowserWindow` 现在已显式声明：
  - `preload`
  - `contextIsolation: true`
  - `sandbox: false`
  - `nodeIntegration: false`
- renderer 端已加入 bridge 缺失提示，避免再次黑屏
- 主进程已接入 `did-finish-load` / `did-fail-load` / renderer console 日志
- `make dev` 启动前已加入旧 watcher 清理和端口释放检查，避免 5187 冲突

## 本轮动作执行坑点

这轮又定位到一个非常关键的坑：

- Finder 扩展写进请求目录的 `selectedURLs` / `primaryURL` / `currentDirectoryURL`
- 到 Electron 侧是 `file://...` URL
- 不是可以直接传给 `spawn` 或直接写进剪贴板的本地路径字符串

这个坑会直接导致：

- `Copy Path` 复制错误内容
- `Open in VS Code` 传错参数
- 其他文件系统动作未来也可能跟着错

当前已经在 Electron 执行器里补了统一的 URL 到本地路径归一化。后续新增动作时，应优先复用这层转换，而不是直接操作原始 context 字段。

## 本轮 Host 统一结论

这轮又补齐了一条很关键的运行规则：

- Finder 真正加载的扩展始终来自 `/Applications/U-Right.app`
- `make dev` 启动的是 Electron dev Host，而不是第二份原生 Host
- 扩展动作触发后，如果检测到 `dev-host-state.json` 且对应 pid 仍然存活，就跳过 `wakeHostApp()`

这解决了三类症状：

- 右键后又冒出第二个 Host
- 看起来像“前一个 app 闪退”，实际上是切到了另一条宿主链路
- `make dev` 与安装版 Host 图标、窗口来源不一致

## 当前 UI 方向

Electron Host UI 当前不再走黑色工具风，而是改为：

- 浅色暖纸面基底
- 衬线标题 + 系统正文字体的编辑部式信息层级
- 统一顶部品牌栏与 `U-Right` 字标
- 明确区分可拖动区域与可交互控件区域

窗口拖动的关键做法：

- 顶栏使用 `-webkit-app-region: drag`
- 按钮、输入框、链接使用 `-webkit-app-region: no-drag`

这解决了 `hiddenInset` 下“看起来像标题栏，但实际上整个窗口拖不动”的问题。
