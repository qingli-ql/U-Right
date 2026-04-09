# Electron 宿主统一实施方案

更新时间：2026-04-05

## Context

### 问题陈述

当前仓库存在两条“宿主”主线：

- 安装包宿主：`/Applications/U-Right.app`
  - 由 Xcode 构建
  - 可执行文件来自 `Sources/URightHost/`
  - 会被 Finder Extension 通过 bundle id 唤醒
- 开发宿主：Electron dev 进程
  - 由 `npm run electron:dev` 启动
  - 实际业务 UI、设置、Prompt/Result、请求监听都在这里

这导致系统里同时存在：

- 两个不同的宿主实现
- 两套启动链路
- 两个不同的生命周期模型
- 一个 Finder Extension，但它面向的“权威宿主”并不唯一

最终表现为：

- app 没启动时，Finder 可能唤醒原生宿主，而不是当前开发中的 Electron 宿主
- 开发态和发布态的行为不一致
- Dock / 状态栏 / 退出逻辑在两套宿主间分叉
- 请求消费、日志、设置与共享容器的一致性风险长期存在

### 当前代码事实

- Finder Extension 通过 `NSWorkspace.shared.urlForApplication(withBundleIdentifier:)` 唤醒宿主：
  - `Sources/URightFinderExtension/FinderSyncExtension.swift`
- 安装产物来自 Xcode 的 `URightHostApp`：
  - `scripts/build_app.sh`
  - `scripts/install_app.sh`
  - `Resources/App/Info.plist`
- Electron 仅作为独立 dev/runtime 进程存在：
  - `package.json`
  - `electron/src/main/index.ts`
  - `electron/src/main/request-watcher.ts`

### 最终目标

**`/Applications/U-Right.app` 必须就是 Electron 宿主本体。**

Finder Extension 继续是原生 `.appex`，但它只嵌入这一份 Electron app 中。

这意味着最终只有一个权威宿主：

- bundle id：`com.openai.uright`
- 安装路径：`/Applications/U-Right.app`
- UI / 执行 / 生命周期：Electron
- Finder 集成：原生 Finder Sync Extension

---

## Why This Direction

### 为什么必须这样统一

1. Finder 只能稳定唤醒一个 bundle id 对应的 app。
2. 用户只能理解一个 “U-Right.app”。
3. 设置、日志、请求监听、AI 执行、状态栏行为不应该依赖“当前跑的是哪种宿主”。
4. 打包、签名、公证也必须以一个最终 app bundle 为中心，而不是两套宿主拼接后的临时状态。

### 为什么不保留双宿主

双宿主的长期问题不是“稍微复杂一点”，而是结构性漂移：

- Finder 唤醒语义不可避免地偏向安装包
- 开发态 workaround 会越来越多
- 文档和验证都会被迫区分“原生 Host”与“Electron Host”
- 发布前很难证明用户拿到的 bundle 与开发时验证的是同一个系统

---

## Scope

### In Scope

- 统一宿主为 Electron app bundle
- 保留原生 Finder Sync Extension，并嵌入 Electron app
- 统一安装、开发、签名和 reload extension 链路
- 统一 Dock / 状态栏 / 单实例 / 退出策略
- 统一 Finder 唤醒目标
- 明确 native 代码在最终架构中的职责边界

### Out Of Scope

- 本轮不设计 MAS 版本变体
- 本轮不设计 Windows/Linux 打包
- 本轮不改 Finder Extension 的产品行为
- 本轮不扩展 AI 能力，只统一宿主架构

---

## Target Architecture

```text
/Applications/U-Right.app
├── Contents/
│   ├── MacOS/
│   │   └── U-Right                 # Electron 主宿主
│   ├── Resources/
│   │   ├── app.asar or unpacked
│   │   ├── electron main bundle
│   │   └── renderer assets
│   ├── Frameworks/
│   │   └── Electron Helpers...
│   ├── PlugIns/
│   │   └── U-Right Finder Sync.appex
│   └── Info.plist
```

### 模块职责

- Finder Extension：
  - 保持原生、保持薄
  - 只负责上下文、菜单、请求落盘、唤醒宿主
- Shared：
  - 继续维护模型、设置、路径、共享协议
- Electron 主宿主：
  - 唯一宿主入口
  - 唯一请求消费方
  - 唯一状态栏/Dock/生命周期控制方
- 旧 `Sources/URightHost/`：
  - 不再参与默认 app 产物
  - 如需保留，仅作为历史参考或未来 bridge/diagnostic 工具，不进入最终 bundle 主执行路径

---

## Implementation Plan

### Step 0：先让 Electron 具备“可打包、可安装、可被 Finder 唤醒”的运行条件

#### 目标

在切换最终产物真相源之前，先把当前 Electron 主宿主中所有依赖“仓库工作目录 / 裸进程启动 / 旧安装包信息”的运行时假设收敛掉。

换句话说，先确保 Electron 在正式 `.app` 内运行时：

- 能正确找到 main / preload / renderer 资源
- 能正确找到图标、品牌资源和本地静态文件
- 能从自身 bundle 或显式环境变量解析 app group，而不是偷偷依赖旧 `/Applications/U-Right.app`
- 能区分 dev / packaged 两种资源来源，但仍保持同一个宿主身份

#### 为什么必须先做

如果不先做这一步，就直接把“最终产物真相源”切到 Electron，会出现一种很危险的假统一：

- Finder 已经唤醒 Electron app bundle
- 但 Electron 自己仍按“裸进程 + 仓库 cwd + 已安装旧 app”思路找资源
- 结果是启动失败、图标丢失、shared container 解析错、dev/prod 行为继续分叉

这类问题会让后续打包、签名、安装链路全部变成调试噪音，掩盖真正的架构收敛工作。

#### 需要收敛的内容

1. 统一运行时路径解析
   - 不再依赖 `process.cwd()` 查找图标和品牌资源
   - 明确定义 packaged app 内：
     - main bundle 路径
     - preload 路径
     - renderer 入口路径
     - 静态资源路径
2. 统一 app group 解析真相源
   - Electron 优先从自身 bundle 的 `Info.plist` 或显式环境变量读取 `URightAppGroupIdentifier`
   - 不再把“读取旧 `/Applications/U-Right.app/Contents/Info.plist`”当作常态路径
3. 设计 dev manifest
   - 明确 dev 模式只是一种资源来源切换，而不是另一种宿主身份
   - manifest 至少要能表达：
     - renderer dev server URL
     - dev enabled / disabled
     - 可选的调试标记信息
4. 显式定义 packaged / dev 资源装载策略
   - packaged：本地 renderer 资源
   - dev：安装版 Electron app + dev manifest + Vite renderer
5. 定义过渡期兼容边界
   - 旧原生 Host 仍可保留为构建辅助 target
   - 但不再作为 Electron 运行时依赖来源

#### 这一阶段建议改动的主要区域

- `electron/src/main/index.ts`
- `electron/src/main/store.ts`
- `electron/src/shared/brand.ts`
- 新的 `electron/src/main/runtime-paths.ts`（或同类模块）
- 新的 `electron/src/main/dev-manifest.ts`

#### 完成标志

- Electron 可以在“非仓库 cwd”下正常启动
- Electron 可以在正式 `.app` 结构中找到自己的 preload / renderer / 图标资源
- Electron 不依赖旧原生安装包也能解析 app group
- dev 模式和 packaged 模式共享同一个 bundle 身份，只切换资源来源

---

### Step 1：定义新的打包真相源

#### 目标

把当前“Xcode app 是最终产物”的真相源，改成“Electron app 是最终产物”。

#### 方案

- 引入一条新的装配脚本，例如：
  - `scripts/package_electron_app.sh`
  - `scripts/assemble_app_bundle.sh`
- 这条链路负责：
  1. 构建 Electron main/renderer
  2. 产出 Electron `.app`
  3. 构建 Finder Sync `.appex`
  4. 将 `.appex` 嵌入 Electron `.app`
  5. 注入最终 `Info.plist`
  6. 重签名

#### 为什么先做这个

因为只要最终产物的真相源还在 Xcode app，后面所有“宿主统一”都只会停留在逻辑层 workaround。

#### 需要改的主要区域

- `package.json`
- 新的 `scripts/package_electron_app.sh`
- 新的 `scripts/build_extension.sh`
- `Makefile`
- `scripts/install_app.sh`

---

### Step 2：把 Xcode 产物从“主 app”降为“扩展构建器”

#### 目标

Xcode 不再负责构建最终 `U-Right.app` 主宿主，只负责：

- `URightShared`
- `URightFinderSync.appex`

#### 方案

- 新建或调整 Xcode scheme，使其只构建：
  - `URightFinderSync`
  - `URightShared`
- `URightHostApp` 不再是发布产物链路的核心
- 最终安装脚本不再从 `build/xcode/Debug/U-Right.app` 拿整包安装

#### 当前坑点

现有脚本中大量默认假设：

- `build_app.sh` 以 `URightHostApp` 为 scheme
- `install_app.sh` 直接复制 Xcode app bundle
- `reload_extension.sh` 假设 extension 来自该 app

这些都需要同步改，不然会出现“脚本还在装旧原生宿主”的隐性回退。

---

### Step 3：建立 Electron app 的正式 macOS 打包配置

#### 目标

让 Electron 宿主具备正式 `.app` 结构，而不是 dev 时直接运行裸 Electron binary。

#### 方案

推荐两种做法，优先选 A：

##### A. 使用 `electron-builder`

优点：

- macOS app bundle 结构成熟
- helper、framework、Resources、Info.plist 注入能力成熟
- 后续签名和 notarization 更容易接轨

需要解决：

- `.appex` 注入不是默认能力，需要 afterPack/afterSign 自定义脚本
- entitlement 与 app group 仍需自己控制

##### B. 自定义装配脚本生成 `.app`

优点：

- 完全可控
- 更贴近当前仓库已经有的 shell 脚本风格

缺点：

- 要自己维护 Electron helper、Info.plist、Frameworks、签名顺序
- 长期维护成本更高

#### 结论

**推荐 A：`electron-builder + 自定义 appex 注入/签名脚本`。**

这是当前长期目标里维护成本最低、发布链路最稳的选择。

---

### Step 4：把 Finder Extension 嵌入 Electron app

#### 目标

Finder Sync extension 仍然原生，但它必须存在于最终 Electron app bundle 内。

#### 方案

- 从 Xcode extension build 产物拿到：
  - `U-Right Finder Sync.appex`
- 拷贝到：
  - `U-Right.app/Contents/PlugIns/U-Right Finder Sync.appex`
- 确保 extension 的 `Info.plist` 和 entitlements 继续由 Xcode 产出

#### 坑点

- `.appex` 不能只复制目录名，必须保留其内部签名和结构
- 注入后整个 app 的签名会失效，必须重新签名主 app
- 不能先签主 app 再注入 `.appex`

---

### Step 5：统一主 app 的身份信息

#### 目标

Electron app 的最终身份必须与当前 Finder 认知保持一致。

#### 必须统一的字段

- `CFBundleIdentifier = com.openai.uright`
- `CFBundleName / PRODUCT_NAME = U-Right`
- `CFBundleExecutable = U-Right`
- `LSUIElement = true`
- `URightAppGroupIdentifier = <team-based app group>`

#### 原因

- Finder Extension 当前就是按 `com.openai.uright` 去唤醒宿主
- 如果 Electron bundle id 变了，就会直接破坏 Finder 唤醒链路
- 如果 `LSUIElement` 没同步，Dock/状态栏行为会继续漂移

#### 坑点

- Electron 打包默认 bundle id、helper id、可执行名可能与当前期望不同
- 必须显式在打包配置里锁死这些字段，不能依赖默认值

---

### Step 6：统一开发态和发布态入口

#### 目标

`make dev` 也要走同一个 bundle，不再直接启动裸 Electron 进程。

#### 方案

开发态也启动 `/Applications/U-Right.app`，只是它在内部识别 dev 模式：

- 主 app 启动时读取共享容器或本地文件中的 `dev manifest`
- 如果存在 dev manifest：
  - main 仍来自打包后的 Electron main
  - renderer 指向 `http://127.0.0.1:5187`
- 如果不存在：
  - 加载打包后的本地 renderer 资源

#### 为什么必须这样

只有这样，开发态和发布态才真正是同一个宿主身份、同一条 Finder 唤醒链路、同一个生命周期模型。

#### 不能继续这样做

- `electron electron/dist/main/main/index.js`

这条命令只能作为构建期内部调试工具，不能继续作为产品宿主入口。

---

### Step 7：统一请求消费与单实例约束

#### 目标

保证只有 Electron 主宿主消费请求。

#### 方案

- Electron 主进程加入 `app.requestSingleInstanceLock()`
- 第二实例只负责激活现有实例，不消费请求
- `request-watcher` 只在主实例启动
- 原生 `Sources/URightHost/` 不再订阅 distributed notification，也不再扫 request 目录

#### 坑点

- 如果旧原生 Host 仍被系统或脚本拉起，就会出现双消费
- 所以它必须从默认产物链路里彻底退出，而不是“理论上不用”

---

### Step 8：重新定义签名顺序

#### 目标

让最终 Electron app + Finder extension 成为一个可签名、可公证的统一产物。

#### 推荐签名顺序

1. Electron helpers / frameworks
2. `Contents/PlugIns/U-Right Finder Sync.appex`
3. 主 app `U-Right.app`

#### 现有脚本的问题

当前 `scripts/sign_app.sh` 是基于 Xcode app 结构写的，并且只覆盖：

- 主 app
- `.appex`

在 Electron 方案下，必须扩展到：

- Electron Framework.framework
- helper apps
- 可能的 `app.asar.unpacked` 二进制

否则签名校验会在 helper/framework 层就失败。

---

### Step 9：改写安装与 reload 链路

#### 目标

所有安装与调试脚本都围绕 Electron app 工作。

#### 需要改写的脚本

- `scripts/build_app.sh`
- `scripts/install_app.sh`
- `scripts/run_app.sh`
- `scripts/dev_electron.sh`
- `Makefile`

#### 新语义建议

- `make build`
  - 构建 Electron app + Finder extension + 最终签名 app
- `make install`
  - 安装最终 Electron app 到 `/Applications/U-Right.app`
- `make dev`
  - 写入 dev manifest
  - 启动 Vite
  - 安装 Electron app
  - reload extension
  - 打开 `/Applications/U-Right.app`

---

## Ownership

- Finder Extension：
  - 继续原生
  - 只改唤醒与宿主发现逻辑，不能变厚
- Shared：
  - 继续负责 app group、共享路径、host runtime、协议
- Electron main：
  - 负责唯一宿主生命周期、单实例、tray、request watcher、dev manifest 读取
- Packaging scripts：
  - 负责装配、签名、安装、extension 注入
- 旧原生 Host：
  - 从默认宿主链路中退出

---

## Risks

### 1. 签名风险

- Electron helpers 未签
- appex 注入后主签名失效
- app group entitlement 不一致

解决方式：

- 把签名步骤做成固定顺序脚本
- CI/本地都跑 `codesign --verify --deep --strict --verbose=2`

### 2. LaunchServices / pluginkit 缓存风险

- 系统仍记住旧 app 路径
- extension reload 指向旧 bundle

解决方式：

- 安装前卸载旧注册
- 安装后重新 `lsregister`
- reload extension 固定只指向 `/Applications/U-Right.app`

### 3. 开发态漂移风险

- 开发还在跑裸 Electron
- Finder 唤醒的是安装版 Electron app
- 两者加载的代码不一致

解决方式：

- dev 也只启动安装包
- 用 dev manifest 控制 renderer/source 路径

### 4. 生命周期风险

- Dock/状态栏/退出策略在 dev 与 prod 不一致

解决方式：

- 所有生命周期策略只放在 Electron 主宿主
- 不允许第二套宿主再定义退出/恢复行为

### 5. 回退风险

- 某个脚本仍偷偷使用 Xcode app 产物

解决方式：

- 明确废弃 `URightHostApp` 作为最终产物
- 在脚本里直接报错，不允许装配旧原生宿主

---

## Better Alternatives Considered

### 方案 A：继续双宿主，但加强协调

不选。

原因：

- 不能从根本上消除 Finder 唤醒错宿主的问题
- 只会继续堆 runtime preference / marker / fallback
- 长期维护成本高于一次性收敛

### 方案 B：原生 Host 做长期 launcher，Electron 永远做子进程

不选。

原因：

- 用户拿到的仍然是“原生 app + Electron 子进程”的双宿主模型
- Dock、菜单栏、单实例、crash 恢复都会更复杂
- 签名、调试、问题归因也更绕

### 方案 C：Electron 主宿主，原生扩展嵌入

选这个。

原因：

- 用户感知只有一个 app
- Finder 唤醒目标唯一
- 宿主生命周期唯一
- 长期最易维护

---

## Verification

### Build / Packaging

- `npm run electron:build`
- 新的 Electron 打包命令
- 新的 extension-only 构建命令
- 最终装配命令
- `codesign --verify --deep --strict --verbose=2 /Applications/U-Right.app`

### Runtime

- 冷启动时 Finder 右键触发，拉起的是 `/Applications/U-Right.app`
- 不会再拉起旧原生 Host
- 运行中只存在一个 U-Right 主宿主实例
- 不出现在 Dock，只出现在状态栏
- 只有状态栏 Quit 能真正退出

### Finder Contexts

- 文件
- 文件夹
- 多选
- 空白区域

### Consistency

- Settings 写入仍能被 extension 读取
- Finder snapshot 仍能落到共享容器
- request handoff 仍能被主宿主消费

---

## Task Breakdown

1. 引入 Electron 正式打包方案，并锁定主 app bundle id / executable / plist
2. 调整 Xcode 工程与脚本，使其只负责 Finder extension 与 shared 原生构建
3. 编写 `.appex` 注入与统一签名脚本
4. 改写安装脚本，使 `/Applications/U-Right.app` 来源切换到 Electron app
5. 改写 `make dev`，只通过安装包启动 dev 模式
6. 加入 dev manifest 机制，统一 dev/prod 入口
7. 让 Electron 成为唯一 request consumer，并加入单实例锁
8. 从默认产物链路移除原生 Host
9. 补齐签名、公证、Finder 回归验证

---

## Definition Of Done

- `/Applications/U-Right.app` 是 Electron 宿主，而不是原生 Host
- Finder Extension 内嵌于该 Electron app
- Finder 唤醒永远只命中这一个宿主
- 开发态与发布态共享同一个 app bundle 入口
- 不再存在“另一个程序被拉起”的宿主漂移
- Dock / 状态栏 / Quit 行为在 dev/prod 一致
- 安装、签名、公证、reload extension 链路都围绕这一份 app 工作
