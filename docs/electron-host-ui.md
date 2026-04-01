# Electron Host UI

这个目录下的 Electron Host 是 U-Right 宿主 UI 的新主线实现：

- 技术栈：Electron + TypeScript + React + Vite
- 目标：接管 Settings / Prompt / Result / Logs / Onboarding
- 保留：原生 Finder Sync Extension 与共享动作模型

## 当前已落地

- `electron/` 工程骨架
- 共享 JSON 设置读写
- 请求目录监听与动作消费框架
- 深色专业工具风的 Settings 页面
- Prompt / Result / Logs / Onboarding 首版窗口

## 开发命令

```bash
npm install
npm run electron:dev
```

## 构建命令

```bash
npm run electron:build
```

## 共享状态

Electron 与 Finder Extension 共享以下路径：

- 设置：`~/Library/Group Containers/group.com.openai.uright/settings.json`
- 备份：`~/Library/Group Containers/group.com.openai.uright/settings.backup.json`
- 请求目录：`~/Library/Group Containers/group.com.openai.uright/Requests`

如果本机当前没有有效的 App Group 容器，Electron 会退回：

- `~/Library/Application Support/U-Right`

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
