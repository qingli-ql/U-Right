# U-Right

U-Right 是一个面向 macOS Finder 的超级右键工具。

当前默认主线不是纯原生 App，也不是纯 Electron，而是：

- 原生 `Finder Sync Extension`：采集 Finder 上下文、生成菜单、转发请求
- `Electron Host`：设置、日志、Prompt、Result、动作执行
- `Shared`：动作注册表、设置模型、共享协议

旧的原生 AppKit Host 仍保留，但当前只作为兼容 / 对照路径，不是默认开发主线。

## 当前文档

- 项目进度：`docs/project-progress.md`
- 收缩原则与 TODO：`docs/product-planning-settings-contextmenu-ai.md`
- 动作状态：`docs/action-implementation-status.md`
- 一致性 TODO：`docs/context-menu-consistency-todo.md`
- Finder 排障：`docs/finder-sync-debugging.md`
- 发布清单：`docs/release-checklist.md`

## 目录结构

- `Sources/URightFinderExtension`：Finder Sync Extension
- `Sources/URightShared`：共享模型、设置、注册表、handoff
- `Sources/URightHost`：旧原生宿主，对照路径
- `electron/`：当前默认宿主主线
- `Resources/App`：宿主资源与 entitlements
- `Resources/Extension`：扩展资源与 entitlements
- `scripts/`：构建、安装、启动、排障脚本

## 当前推荐用法

### 开发

```bash
make dev
```

这条命令会：

- 构建并安装 `/Applications/U-Right.app`
- 刷新 Finder Extension
- 清理旧 Electron / Vite 进程
- 启动当前 Electron Host

### 只构建

```bash
make build CONFIG=Debug
make build CONFIG=Release
```

### 安装

```bash
make install CONFIG=Debug
```

## 常用命令

```bash
make dev
make build CONFIG=Debug
make install CONFIG=Debug
make extension-status
make doctor
make dump-entitlements
make debug-unified-log
```

## 当前设计原则

- Finder Extension 保持薄
- 菜单、预览、设置尽量共用一套真相
- 执行器只负责 `actionID -> handler`
- 没做完的动作默认隐藏

## 当前状态

项目已经是可运行原型，但还不是发布完成态。

已经打通：

- Finder 菜单主链路
- Electron Host 主链路
- 核心动作执行
- Settings / Prompt / Result / Logs 基础体验
- Context Menu 工作台基础体验

还没完成：

- 一批隐藏动作的真正落地
- 多级子菜单树编辑器
- 发布级签名与公证
- 最小自动化验证

## Context Menu 当前能力

当前 `Context Menu` 设置页已经支持：

- 分类排序
- 动作排序
- 动作跨组移动
- 分组布局切换（`inline / submenu`）
- 动作/分组启用禁用
- 解释“为什么当前上下文不显示这个动作”

当前还**不支持**真正的任意多级树形子菜单编辑。

## 排障约定

- 默认开发入口：`make dev`
- 默认权威安装路径：`/Applications/U-Right.app`
- 菜单有问题时，先看 `docs/finder-sync-debugging.md`

