# U-Right

[![Platform](https://img.shields.io/badge/platform-macOS%2026-0A84FF)](https://www.apple.com/macos/)
[![Finder](https://img.shields.io/badge/Finder-Native%20Extension-34C759)](./docs/guide.md)
[![Host](https://img.shields.io/badge/Host-Electron%20%2B%20React-F59E0B)](./docs/guide.md)
[![Status](https://img.shields.io/badge/status-active%20guide-2F855A)](./docs/guide.md)

**Finder-native super context menu for macOS, with AI actions, templates, and tool shortcuts.**

U-Right 是一个面向 macOS Finder 的超级右键工具。当前只维护一条主线：

- 原生 `Finder Sync Extension`
- `Electron Host`（TypeScript + React + Vite）
- `Shared / Manifest`

完整主线说明见 [docs/guide.md](./docs/guide.md)，完整动作状态见 [docs/action-implementation-status.md](./docs/action-implementation-status.md)。

## 快速开始

```bash
make dev
```

常用命令：

```bash
make doctor
make tail-logs
npm run electron:build
npm run validate:action-registry
npm run validate:settings-migration
```

Finder 菜单相关改动后，重新走 `make dev`，再在 Finder 中对真实目标右键一次，让扩展写出最新快照。

## 最终文档入口

- [docs/guide.md](./docs/guide.md)：唯一主指南
- [docs/action-implementation-status.md](./docs/action-implementation-status.md)：动作状态表
- [docs/README.md](./docs/README.md)：当前文档目录
- [archive/docs/README.md](./archive/docs/README.md)：历史归档入口
