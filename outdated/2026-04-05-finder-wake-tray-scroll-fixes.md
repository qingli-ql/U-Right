# Finder 唤起 / 菜单栏图标 / 页面滚动修复

更新时间：2026-04-05

## Context

当前有三个用户可见问题同时存在：

1. 退出宿主后，Finder 右键菜单仍然显示，但点击后没有实际效果。
2. Electron 宿主运行时，顶部菜单栏没有 U-Right 图标。
3. Electron 的 Settings / Logs 页面存在布局与滚动异常，尤其 Logs 不能稳定上下滚动。

这三个问题都落在宿主边界上：

- Finder Extension 负责落盘请求并唤起宿主
- Electron main 负责菜单栏 presence
- Renderer 负责窗口高度与滚动容器分配

## Scope

### In Scope

- 修复 Finder Extension 在宿主已退出时的唤起策略
- 增强 Finder Extension 对宿主 app 路径的解析与日志
- 修复 Electron 菜单栏图标创建与设置页显隐联动
- 修复 Settings / Logs 容器高度与滚动分配

### Out Of Scope

- 不改 Finder 菜单内容本身
- 不改 action 执行业务逻辑
- 不做 Settings 页视觉重设计
- 不改签名、公证、扩展 enablement 流程

## Behavior

- 当没有活跃的 dev host 时，Finder 点击菜单必须尝试唤起已安装宿主，而不是因为历史 `electron-dev` 偏好直接跳过。
- Finder Extension 应优先尝试从自身 `.appex` 所在 bundle 反推宿主 `.app`，再回退到 bundle identifier 查询。
- Electron 在 `showMenuBarIcon = true` 时稳定显示菜单栏图标；设置改动后应立即生效。
- Settings 窗口应填满可用高度，内部内容区自己滚动。
- Logs 窗口应固定头部/过滤区，日志列表区域可独立纵向滚动。

## Ownership

- Finder 唤起策略：`Sources/URightShared/Utilities.swift`
- Finder 宿主定位与唤起：`Sources/URightFinderExtension/FinderSyncExtension.swift`
- Electron 菜单栏状态：`electron/src/main/index.ts`
- Renderer 布局滚动：`electron/src/renderer/styles.css`

## Risks

- 改唤起策略时不能重新把复杂逻辑塞回 Finder Extension。
- Electron 菜单栏显隐要尊重设置，不要引入托盘重复创建或悬空对象。
- 滚动修复要避免影响 Prompt / Result 窗口现有行为。

## Verification

- Finder：在宿主退出后，从 file / folder / multi / empty context 触发任一 action，确认请求被消费。
- Tray：启动 Electron 后确认菜单栏可见；切换 `Show menu bar icon` 后立即显隐。
- Settings：窗口缩放后 sidebar/content 仍可正常滚动。
- Logs：写入较多日志后可稳定上下滚动、筛选区不压扁。

## Task Breakdown

1. 修正 HostWakePolicy，移除会阻止冷启动唤起的错误分支。
2. 为 Finder Extension 增加更稳的宿主 `.app` 发现与日志。
3. 为 Electron 增加 tray 同步更新逻辑并强化图标加载。
4. 调整 Settings / Logs 布局，让高度和滚动容器边界明确。
