# Electron Host UI

更新时间：2026-04-02

Electron Host 是当前默认宿主主线。  
它负责设置、日志、Prompt、Result，以及 Finder 请求的执行。

## 当前职责

- Settings
- Prompt
- Result
- Logs
- Onboarding
- 请求目录监听
- 动作执行

## 当前已完成

- `preload -> contextBridge -> renderer` 基础 bridge
- Settings / Prompt / Result / Logs / Onboarding 窗口
- 请求目录监听与动作消费
- 共享 JSON 设置读写
- 目录选择、应用选择、日志清理、结果保存 / 回写 IPC
- Dock / Tray 图标接入

## 当前推荐启动方式

统一使用：

```bash
make dev
```

原因很简单：

- 会安装最新 `/Applications/U-Right.app`
- 会刷新 Finder Extension
- 会清理旧 Electron / Vite 进程
- 能减少“窗口打开了但不是当前代码”的问题

## 不建议的做法

- 不建议把多套 Electron / Vite 命令当主入口
- 不建议一边跑安装版 Host，一边跑残留的 dev Host

## 当前踩坑

### 1. preload bridge 丢失

现象：

- renderer 有界面，但 `window.uright` 不可用

应对：

- 先确认是不是旧进程 / 旧入口残留
- 优先重新走 `make dev`

### 2. 旧 renderer 被复用

现象：

- 改了代码，窗口行为却不像当前版本

应对：

- 清理旧 `vite` / `electron` / `wait-on`
- 继续把开发入口统一在 `make dev`

### 3. 结果窗口只是 MVP

现象：

- 长输出、错误提示、代码块体验还不够稳

应对：

- 先补清晰错误信息和长输出体验
- 不急着做复杂 UI

## 当前收缩方向

- Host 继续做默认主线
- 原生 Host 仅作为兼容 / 对照路径保留
- 少加新窗口，先把 Settings / Result / Logs 做稳
