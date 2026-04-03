# Finder Sync 排障记录

更新时间：2026-04-02

这份文档只保留已经踩过的关键坑和当前应对策略。

## 当前判断

Finder 菜单是否出现，核心只看三件事：

- 扩展产物是不是合法的 Finder Sync executable
- 系统实际注册并启用的是哪一份扩展
- 当前开发入口是不是你以为的那一份 Host / Extension

## 踩过的坑

### 1. `.appex` 里放了错误产物

现象：

- 看起来像扩展，但 Finder 不加载

根因：

- `.appex` 内部是 `dylib`，不是 Finder Sync 可执行文件

应对：

- 只认 Xcode 原生产物
- 用 `file` / `pluginkit` / `codesign` 检查

### 2. 看错系统设置页面

现象：

- 以为已经开了扩展，但 Finder 菜单还是不出现

根因：

- 开的是 `File Provider`，不是 `Finder Extensions`

应对：

- 只在 `Finder Extensions` 页面启用 `U-Right Finder Sync`

### 3. 同 bundle id 多份产物并存

现象：

- 有时有菜单，有时没有
- 很难判断系统到底加载哪一份

应对：

- 日常只保留 `/Applications/U-Right.app` 作为权威安装路径
- 不把多个同 bundle id 构建产物同时拿来排障

### 4. 安装 / 刷新存在竞态

现象：

- 覆盖安装后，扩展状态不稳定

应对：

- 开发统一走 `make dev`
- 不再手工拼旧的安装和重载命令序列

### 5. Electron / Vite 旧进程残留

现象：

- 看起来启动成功，但实际不是当前代码

应对：

- 统一走 `make dev`
- 让 `scripts/dev_electron.sh` 负责清理旧进程

## 当前排障顺序

### 1. 先确认扩展是否被识别

```bash
make extension-status
```

### 2. 再确认当前安装路径和 entitlement

```bash
make doctor
make dump-entitlements
```

### 3. 再看 Finder / PlugInKit 日志

```bash
make debug-unified-log
```

### 4. 最后确认是不是旧进程 / 旧产物干扰

```bash
make dev
```

## 当前约定

- 默认开发入口：`make dev`
- 默认权威安装路径：`/Applications/U-Right.app`
- 默认排障思路：先看产物合法性，再看系统注册状态，再看运行入口是否一致
