# U-Right 架构重置 PRD / 重构实施蓝图

更新时间：2026-04-05

状态：执行中（截至 2026-04-07：Phase 1-4 已完成，Phase 5-7 可按 PRD 并行推进）

文档目标：作为本项目接下来一轮系统性重构的唯一执行蓝图。本文档拒绝中间态兼容方案，拒绝长期双轨，拒绝“先补一个兜底以后再收口”的做法。

## 执行状态回写（2026-04-07）

### Done

- Phase 1：宿主真相收口完成
- Phase 2：action manifest 单源化完成
- Phase 3：settings schema v3 完成
- Phase 4：request queue 可靠化完成

### In Progress

- Parallel Track A：Electron Main 分层进行中
- Parallel Track B：Renderer 分窗口拆分进行中
- Parallel Track C：测试补齐进行中
- Parallel Track D：文档清理进行中

### 验证通过

- Phase 1：已取得 2026-04-07 Finder 真实右键日志，证明 Extension 写入 request 并被 Electron watcher 消费
- Phase 2：`npm run validate:action-registry` 通过，静态 action 元数据字段级 parity 通过
- Phase 3：settings migration fixture、compiled store migration、candidate settings file、Swift legacy decode/encode round-trip 均通过
- Phase 4：`node scripts/validate_request_queue.js` 通过，已覆盖 incoming 消费、processing 恢复、parse error、dispatch failure；同时 `npm run electron:build:main`、`npm run electron:build:renderer`、`swift test` 通过
- Parallel Track A（当前子步骤）：`electron/src/main/action-runner/dispatcher.ts` 已收敛到 57 行，`npm run electron:build:main`、`npm run electron:build` 通过
- Parallel Track B（当前子步骤）：`App.tsx` 已收敛到 922 行，`general/tools/ai/templates/advanced` 分区已迁出到 `settings-sections.tsx`，`npm run electron:build:renderer`、`npm run electron:build` 通过
- Parallel Track A（行为级验证）：`npm run validate:action-dispatch-smoke` 通过，已覆盖 `copy.path`、`create.new-folder`、`open.vscode`、`file.rename`、`file.json-format`、`view.refresh`、`view.toggle-hidden`、`git.status`、`create.template.markdown`、`open.custom.smoke-app`、`ai.ask-codex` 缺 CLI、unknown action fallback
- Parallel Track B（最小行为级 smoke）：`npm run validate:renderer-smoke` 通过，已覆盖 `AppRouter` 初始 loading shell 与 `SettingsSidebar` 导航/restore/save 控件渲染

### 当前风险 / 阻塞

- 已解除串行阻塞；当前风险转为并行阶段的接口漂移和验证覆盖不足
- `electron/src/main/action-runner/command-helpers.ts` 仍偏大，helper 边界与职责还需继续收口
- `electron/src/renderer/App.tsx` 虽已收敛到 922 行，但仍未收敛到纯 route switch
- Settings 主体中的 `context-menu/workbench` 交互仍缺行为级覆盖；Finder 真实交互回归尚未并入自动化 smoke

### Next

- 继续推进 Parallel Track A：拆 `command-helpers.ts`，收口 path/prompt/io helper 边界
- 继续推进 Parallel Track B：优先抽离 `context-menu/workbench` 的只读派生逻辑 hook，再分步拆交互组件
- 继续推进 Parallel Track C / D：补 Settings 主体与 Finder 主流程验证，持续更新 current-state / PRD / run-status

---

## 1. 问题定义

### 1.1 当前核心问题

U-Right 当前不是“功能没做完”，而是“主链路已打通，但系统真相分散、职责边界混乱、重复实现过多”。继续在现状上叠加功能，会出现以下结构性失控：

- 同一套产品语义在 Swift Shared、Finder Extension、Electron Main、Renderer、旧 Native Host 中重复实现
- 同一 action 的定义、可见性、执行条件、执行行为、设置默认值没有单一事实源
- Electron Main 与 Renderer 都已经形成大文件和大对象，变更成本快速上升
- 当前默认主线是 Electron，但旧原生 Host 仍保留完整执行链路，导致宿主真相不唯一
- 缺少可重复自动化验证，任何重构都容易变成“看起来更整洁，实际行为漂移”

### 1.2 本轮重构的目标

本轮不是“优化一下代码风格”，而是要完成一次明确的系统收口：

1. 只有一个权威宿主：Electron Host。
2. 只有一个 action 真相源：单一 manifest / schema。
3. 只有一个 settings 持久化模型：嵌套结构，不保留双轨镜像字段。
4. Finder Extension 保持 thin，不承载复杂业务编排。
5. Electron Main 不再使用大文件集中处理全部行为。
6. Renderer 不再把多个窗口和多个领域塞进一个文件。
7. 每一个需求完成后，都必须有可重复执行的验证路径。

### 1.3 成功标准

当以下条件全部成立时，本轮才算完成：

- `Sources/URightHost/` 不再参与默认产品主链路，不再承担真实动作执行职责
- action 定义不再在 Swift/TS 中双份手写维护
- settings schema 没有扁平字段与嵌套字段双写同步逻辑
- Electron Main 的窗口、IPC、执行、队列、工具探测分模块管理
- Renderer 每个窗口有独立入口，`App.tsx` 不再承载巨量领域逻辑
- Finder file / folder / multi / empty 四类上下文通过验证
- CLI-present / CLI-missing 两类 AI 路径通过验证
- 文档、实现、验证结果一致

---

## 2. 产品范围

### 2.1 In Scope

- 宿主真相收口
- action registry 单源化
- settings schema 收口
- Electron Main 分层拆分
- Renderer 分窗口拆分
- 请求交接队列重构
- 自动化测试和可重复手工验证补齐
- 文档和状态说明收口

### 2.2 Out Of Scope

- 新增 Finder 功能品类
- 新增全新 AI provider 产品能力
- Windows / Linux 支持
- MAS 变体支持
- 视觉重设计
- 不改变现有 Finder 用户路径的基本交互意图

### 2.3 明确禁止项

本轮明确不允许以下做法：

- 不允许继续保留 Electron Host 与 Native Host 双执行链路
- 不允许新增“先兼容旧结构、以后再删”的 adapter 层，除非文档里声明为一次性迁移代码并在同一 PR 内删除旧入口
- 不允许继续手写两份 action 定义
- 不允许继续给 `AppSettings` 增加新的扁平镜像字段
- 不允许把新功能继续塞进 `electron/src/main/index.ts`
- 不允许把新窗口或新面板继续塞进 `electron/src/renderer/App.tsx`

---

## 3. 产品与架构原则

### 3.1 单一事实源原则

以下对象必须只有一个事实源：

- action id、title、category、supported contexts、requirements、default visibility
- settings schema 与默认值
- action availability 规则

### 3.2 薄 Finder 原则

Finder Extension 只负责：

- 采集 Finder 上下文
- 通过共享规则生成菜单
- 写入 action request
- 唤醒 Electron Host

Finder Extension 不负责：

- 复杂业务判断
- 文件写操作策略
- AI 交互编排
- 设置迁移
- 弹窗编排

### 3.3 Electron 主宿主原则

Electron Host 必须独占：

- settings 读写
- action request 消费
- 复杂动作执行
- Prompt / Result / Logs / Settings UI
- 工具探测
- AI 执行
- 生命周期、单实例、托盘、窗口

### 3.4 面向对象与设计模式原则

本轮要求明确使用以下模式，且用途必须清晰：

- `Command Pattern`
  - 每个 action 对应一个 command handler
  - 用于解耦 action 分发与动作实现
- `Registry Pattern`
  - action registry、handler registry、window registry
  - 用于替代 scattered conditional logic
- `Strategy Pattern`
  - AI provider strategy
  - Tool detection strategy
  - Result apply strategy
- `Factory Pattern`
  - BrowserWindow factory
  - Context builder factory
  - Dynamic action descriptor factory
- `Repository Pattern`
  - SettingsRepository
  - RequestQueueRepository
  - SnapshotRepository
- `Mapper / Translator Pattern`
  - manifest -> TS definition
  - manifest -> Swift definition
  - stored settings -> resolved settings

禁止伪设计模式：

- 不允许“只是把函数移到 class 里”就称为面向对象
- 不允许单个 manager/service 挂几十个方法
- 不允许 registry 只是个大 map，但生命周期、接口、验证都没有边界

---

## 4. 目标架构

## 4.1 顶层模块

### Finder 层

- `Sources/URightFinderExtension/`
  - `FinderContextProvider`
  - `FinderMenuPresenter`
  - `FinderRequestEmitter`
  - `HostWakeService`

### Shared Core 层

- `manifest/`
  - action 真相源
- `Sources/URightShared/Generated/`
  - 从 manifest 生成 Swift 类型
- `electron/src/shared/generated/`
  - 从 manifest 生成 TS 类型
- `Sources/URightShared/`
  - shared models
  - availability evaluator
  - context normalization
  - queue contract

### Electron Main 层

- `electron/src/main/bootstrap/`
  - app bootstrap
  - lifecycle
- `electron/src/main/windows/`
  - BrowserWindow factory
  - window registry
- `electron/src/main/ipc/`
  - settings IPC
  - logs IPC
  - result IPC
  - dialog IPC
- `electron/src/main/actions/`
  - command interfaces
  - action dispatcher
  - action handlers
- `electron/src/main/services/`
  - ToolDetectionService
  - PromptService
  - ResultService
  - AIExecutionService
  - FinderViewService
- `electron/src/main/repositories/`
  - SettingsRepository
  - RequestQueueRepository
  - DiagnosticsRepository

### Renderer 层

- `electron/src/renderer/windows/settings/`
- `electron/src/renderer/windows/prompt/`
- `electron/src/renderer/windows/result/`
- `electron/src/renderer/windows/logs/`
- `electron/src/renderer/windows/onboarding/`
- `electron/src/renderer/components/`
- `electron/src/renderer/hooks/`
- `electron/src/renderer/state/`

---

## 5. 要删除的内容

### 5.1 必删

以下内容不保留为默认产品链路：

- `Sources/URightHost/Services/ActionExecutionService.swift`
- `Sources/URightHost/Controllers/HostActionDispatcher.swift`
- 原生 Host 下完整动作执行器、AI 执行器、打开工具执行器

处理方式：

- 可以保留源码目录作为 archive/reference
- 但不得继续在默认主线中被编译、调用、文档声明为当前执行路径

### 5.2 必删兜底

以下兜底策略必须移除：

- settings 双轨镜像同步
- action definition 双份手写同步
- 宽泛的“如果主路径不一致就再猜一次”的宿主判断
- “读取到旧容器就悄悄兼容”的长期逻辑
- UI 中基于推测而不是实际 snapshot 的默认一致性结论

### 5.3 保留但收口

以下内容可保留，但必须重新归位：

- `ActionIDs.generated.swift`
- Finder snapshot 诊断
- SharedPaths
- build / install / reload extension 脚本

---

## 6. 功能需求与实现方案

## 6.1 FR-01 宿主真相唯一化

### 需求

系统必须只有一个权威宿主：Electron Host。

### 方案

- `/Applications/U-Right.app` 的主执行入口必须是 Electron
- Finder Extension 唤醒的 bundle id 只对应这一份 app
- 原生 Host 代码不再参与 action 执行

### 实现步骤

1. 明确构建产物真相源是 Electron app bundle
2. 将 Finder Extension 嵌入 Electron app bundle
3. 移除原生 Host 作为默认执行目标的文档与脚本路径
4. 将 Native Host 代码移出默认链路

### 验证

- `make dev`
- Finder 右键触发 action
- 仅 Electron Host 消费 request
- 无 Native Host execution log

---

## 6.2 FR-02 Action Registry 单源化

### 需求

所有 action 的元数据必须来源于一个 manifest。

### 方案

建立：

- `manifest/actions.json`

字段至少包含：

- `id`
- `title`
- `category`
- `systemImageName`
- `supportedContexts`
- `defaultOrder`
- `defaultVisible`
- `implementationStatus`
- `requirements`
- `childrenPolicy`

由脚本生成：

- TS `ActionDefinition`
- Swift `ActionDefinition`
- Swift `ActionIDs`
- 默认 category settings
- 默认 action settings
- action 状态文档片段

### 设计模式

- `Template Method` 用于代码生成流水线
- `Mapper` 用于 manifest -> language-specific model

### 实现步骤

1. 定义 manifest schema
2. 写生成脚本
3. 删除 TS/Swift 中手写 action definition
4. 重写 parity check，使其比较完整字段而不是仅 action id
5. 更新文档引用生成结果

### 验证

- 运行生成脚本
- TS build 通过
- Swift build 通过
- parity check 通过
- `open.ghostty` 之类历史漂移项必须在 Finder 与 Electron 两侧一致

---

## 6.3 FR-03 Settings Schema 收口

### 需求

settings 只允许一个持久化模型，不允许保留扁平字段与嵌套字段双轨。

### 方案

建立：

- `StoredSettings`
- `ResolvedSettings`
- `SettingsMigrationV3`

其中：

- `StoredSettings` 是文件持久化结构
- `ResolvedSettings` 是运行时用于 UI 和执行层的解析结构
- migration 只做旧到新的一次性转换

### 实现步骤

1. 设计 v3 schema
2. 在 Swift 与 TS 两侧同步 schema
3. 删除 `normalizeDerivedSettings` 里的双向镜像逻辑
4. 用 repository 统一 settings load/save/migrate
5. 文档明确 v3 是唯一 schema

### 验证

- 用 v2 老 settings 文件启动，自动迁移到 v3
- 再次保存不产生扁平字段
- Electron 与 Finder 读取结果一致
- restore previous 仍然可用

---

## 6.4 FR-04 Action Execution 面向对象拆分

### 需求

Electron 动作执行必须由 command handler 驱动，不允许再靠一个超大 dispatcher 文件。

### 方案

定义接口：

```ts
interface ActionCommand {
  readonly ids: string[];
  canExecute(ctx: ActionExecutionContext): Promise<boolean> | boolean;
  execute(ctx: ActionExecutionContext): Promise<ActionExecutionResult>;
}
```

定义 registry：

- `ActionCommandRegistry`
- `ActionDispatcher`

定义 handler：

- `ClipboardCommand`
- `CreateCommand`
- `OpenCommand`
- `FileOpsCommand`
- `GitCommand`
- `AICommand`
- `ViewCommand`
- `CustomOpenCommand`
- `ScriptRunCommand`

### 设计模式

- `Command`
- `Registry`
- `Strategy` for provider/tool-specific branches

### 实现步骤

1. 抽出 `ActionExecutionContext`
2. 定义统一 `ActionExecutionResult`
3. 为每类动作建立 command class
4. 把通用路径解析下沉到 `ActionContextResolver`
5. 删除 `directHandlers` / `prefixHandlers` 大对象

### 验证

- 每个 command 有单元测试
- 手工回归至少覆盖 1 个 create / open / file / ai / script 动作
- action not implemented 能正确报错

---

## 6.5 FR-05 Request Queue 可靠化

### 需求

Finder -> Host 的 action request 必须可靠消费，不允许依赖脆弱的 `fs.watch + setTimeout` 作为唯一语义。

### 方案

目录结构：

- `Requests/incoming/`
- `Requests/processing/`
- `Requests/done/`
- `Requests/failed/`

语义：

- Finder 只写 `incoming`
- Host 消费前原子 rename 到 `processing`
- 成功后写结果摘要到 `done`
- 失败后写错误摘要到 `failed`
- Distributed notification 只负责 wake，不负责 payload 真相

### 设计模式

- `Repository`
- `Queue Processor`
- `State Machine`

### 实现步骤

1. 改 SharedPaths 和 queue contract
2. 改 Finder request write path
3. 改 Electron watcher 为 queue processor
4. 增加 crash-safe recovery：启动时先扫描 `processing`
5. 增加 failed diagnostics

### 验证

- 模拟多个 request 连续写入
- 模拟 parse error
- 模拟执行中断后重启
- 验证无 request 丢失

---

## 6.6 FR-06 Electron Main 分层

### 需求

Electron Main 不能继续由 `index.ts` 一把抓全部职责。

### 方案

拆分为：

- `bootstrap/app-bootstrap.ts`
- `bootstrap/lifecycle.ts`
- `windows/window-factory.ts`
- `windows/window-controller.ts`
- `windows/window-registry.ts`
- `ipc/register-settings-ipc.ts`
- `ipc/register-dialog-ipc.ts`
- `ipc/register-result-ipc.ts`
- `ipc/register-logs-ipc.ts`
- `services/external-ai-launcher.ts`
- `services/tray-service.ts`

### 设计模式

- `Factory`
- `Facade`
- `Registry`

### 实现步骤

1. 抽出 WindowController interface 和实现
2. 抽出 tray service
3. 抽出 IPC registration modules
4. `index.ts` 只保留 bootstrap
5. 清理跨模块反向依赖

### 验证

- Electron app 正常启动
- 单实例行为正常
- Settings / Logs / Prompt / Result / Onboarding 五个窗口可打开
- tray 功能正常

---

## 6.7 FR-07 Renderer 分窗口与领域拆分

### 需求

Renderer 不允许继续把所有窗口和业务逻辑放在 `App.tsx` 中。

### 方案

拆分文件：

- `windows/settings/SettingsWindow.tsx`
- `windows/settings/useSettingsDraft.ts`
- `windows/settings/components/CategoryWorkbench.tsx`
- `windows/settings/components/ActionInspector.tsx`
- `windows/settings/components/TemplateEditor.tsx`
- `windows/settings/components/OpenActionEditor.tsx`
- `windows/prompt/PromptWindow.tsx`
- `windows/result/ResultWindow.tsx`
- `windows/logs/LogsWindow.tsx`
- `windows/onboarding/OnboardingWindow.tsx`
- `app/AppRouter.tsx`

### 状态管理要求

- settings 草稿使用 `useReducer`
- autosave 逻辑封装为 hook
- diagnostics 获取逻辑封装为 hook
- drag/drop 逻辑封装为 hook 或独立 util

### 必修 bug 修复

- 模板目录选择必须写入 `settings.templates.customTemplateFolder`
- 所有 nested state 更新必须只更新真实 schema 路径

### 验证

- TS typecheck
- settings 保存 / 恢复 / autosave 正常
- 模板目录选择后重启仍保留
- Context Menu 页面在 snapshot 有/无两种情况下显示正确

---

## 6.8 FR-08 Tool Detection 收口

### 需求

工具探测不能在主线程里反复同步执行，且不能每次探测都重新读取 settings。

### 方案

建立：

- `ToolDetectionService`
- `ToolDetectionStrategy`
- `ToolDetectionCache`

行为：

- 启动时预热
- settings 变更时失效缓存
- action 执行期间使用同一份已解析结果

### 验证

- 探测结果正确
- settings 自定义路径修改后能刷新
- 不同 action 内结果一致

---

## 7. 非功能需求

### 7.1 可维护性

- 单文件原则：核心业务文件不超过 300 行，特殊窗口容器不超过 500 行
- 单类职责原则：每个类只服务一个明确领域
- 不允许新增 util god file

### 7.2 可读性

- 类型优先
- 上下文解析逻辑集中
- 错误处理统一
- 文件命名与目录结构直接表达职责

### 7.3 可验证性

- 每个需求必须绑定测试方案
- 每个手工验证步骤要有明确输入、执行步骤、预期结果
- 不得用“应该可以”“理论上”“看起来正常”作为完成标准

---

## 8. 串行与并行执行计划

## 8.1 必须串行

以下阶段必须严格串行：

### Phase 1：宿主真相收口

原因：

- 这是所有后续设计的边界前提
- 不收口会导致后续测试对象不唯一

### Phase 2：action manifest 单源化

原因：

- settings 默认值、availability、UI workbench、执行层都依赖 action 定义

### Phase 3：settings schema v3

原因：

- action/workbench/UI/queue 都要依赖稳定 schema

### Phase 4：request queue 可靠化

原因：

- 这是行为链路稳定性的基础，不应在旧 watcher 之上继续堆功能

## 8.2 可以并行

在上述串行阶段之后，以下可并行：

### Parallel Track A：Electron Main 分层

- owner：`electron/src/main/`

### Parallel Track B：Renderer 分窗口拆分

- owner：`electron/src/renderer/`

### Parallel Track C：测试补齐

- owner：`electron/tests/` + `Tests/URightSharedTests/`

### Parallel Track D：文档清理

- owner：`docs/` + `README.md`

前提：

- action manifest 与 settings schema 已稳定
- request queue contract 已稳定

---

## 9. 具体任务拆分

## 9.1 Phase 1 宿主真相收口

1. 停止原生 Host 参与默认执行链路
2. 调整构建脚本与 README 文案
3. 确认 Finder 唤醒的唯一 bundle 指向 Electron app
4. 删除原生 Host 的“当前主线”文档描述

完成标志：

- 默认开发、运行、安装、唤醒均只走 Electron

## 9.2 Phase 2 action manifest 单源化

1. 新建 manifest schema
2. 写生成脚本
3. 替换 TS 手写 action definitions
4. 替换 Swift 手写 action definitions
5. 扩展 parity test 为字段级校验

完成标志：

- 手写重复定义消失

## 9.3 Phase 3 settings schema v3

1. 设计 `StoredSettingsV3`
2. 写 migration
3. 把 repository 接到 TS
4. 把 repository 接到 Swift
5. 删除扁平镜像字段逻辑

完成标志：

- settings 文件不再出现双轨字段

## 9.4 Phase 4 queue 重构

1. 新 queue 目录 contract
2. SharedPaths 更新
3. Finder 写入逻辑更新
4. Electron queue processor 更新
5. diagnostics 更新

完成标志：

- queue crash-safe，可恢复

## 9.5 Phase 5 Electron Main 拆分

1. 抽 window factory
2. 抽 tray service
3. 抽 IPC 模块
4. 抽 action dispatcher 与 commands
5. 简化 `index.ts`

完成标志：

- `index.ts` 只保留 bootstrap 逻辑

## 9.6 Phase 6 Renderer 拆分

1. 拆 `AppRouter`
2. 拆每个 window
3. 拆 settings hooks / components
4. 修复 nested settings 更新 bug
5. 减少单文件体积

完成标志：

- `App.tsx` 仅负责 route switch

## 9.7 Phase 7 测试与文档闭环

1. 加单元测试
2. 加集成 smoke tests
3. 更新 docs current-state / operations-guide / action-status
4. 记录实际验证结果

完成标志：

- 文档与代码行为一致

---

## 10. 测试方案

## 10.1 自动化测试

### A. Shared / Registry 测试

目标：

- manifest 生成结果一致
- availability evaluator 正确
- dynamic actions 正确

用例：

- file context
- folder context
- multi context
- empty context
- tool present
- tool missing
- AI enabled
- AI disabled

通过标准：

- 所有 action visibility 与 expected fixtures 一致

### B. Settings Migration 测试

目标：

- v2 -> v3 迁移正确

输入：

- 旧格式 settings fixture

检查：

- 无扁平镜像字段残留
- 默认值补齐
- category/action settings 补齐

### C. Queue Processor 测试

目标：

- request 不丢

用例：

- 正常消费
- JSON parse error
- handler throw error
- processing 状态重启恢复

### D. Electron Main 单元测试

目标：

- command registry 能正确分发
- unsupported action 正确失败
- tool detection cache 逻辑正确

### E. Renderer 测试

目标：

- settings reducer 正确
- autosave hook 不会写错路径
- template folder 更新写入正确 nested path

## 10.2 手工验证

### Finder 文件上下文

步骤：

1. `make dev`
2. Finder 中右键单个文件
3. 检查菜单项
4. 执行 `copy.path`
5. 执行 `file.rename`

预期：

- 菜单显示正确
- 文件动作可执行
- 日志中 action request / queue / execution 链路完整

### Finder 文件夹上下文

步骤：

1. Finder 中右键单个文件夹
2. 执行 `create.new-file`
3. 执行 `create.new-folder`
4. 执行一个 open action

预期：

- 创建目标落点正确
- 打开类动作正确

### Finder 多选上下文

步骤：

1. 选择多个文件/文件夹
2. 右键
3. 执行 `copy.path`
4. 执行 `file.compress`
5. 执行 `file.trash` 但取消

预期：

- 单文件动作不误显示
- 多选动作行为正确
- destructive confirm 正常

### Finder 空白区域上下文

步骤：

1. 在文件夹空白区域右键
2. 执行 `create.new-file`
3. 执行 `git.status`

预期：

- 目录解析正确
- 创建落点正确
- Git result 正常

### AI CLI Present

步骤：

1. 配置 `claude` 或 `codex`
2. 执行 AI action

预期：

- Prompt 正常
- Result 正常
- exit code 正确更新状态

### AI CLI Missing

步骤：

1. 让对应 CLI 不可用
2. 执行 AI action

预期：

- 不崩溃
- 明确失败状态
- 文案不虚假宣称成功

## 10.3 发布前检查

- `npm run validate:action-registry`
- TS build
- Swift build
- queue integration smoke
- Finder 四上下文回归
- settings migration smoke
- `codesign --verify --deep --strict --verbose=2 /Applications/U-Right.app`

---

## 11. 风险与应对

### 风险 1：重构期 registry 与 UI 同步中断

应对：

- 先完成 manifest 单源，再启动 UI 拆分

### 风险 2：settings migration 破坏现有用户数据

应对：

- migration fixtures
- 迁移前自动 backup
- 校验后再覆盖

### 风险 3：queue 重构导致 Finder 动作看似失效

应对：

- diagnostics 新增 incoming/processing/failed 状态可视化

### 风险 4：并行开发造成接口漂移

应对：

- 先冻结 manifest schema 与 settings v3 schema
- 并行阶段只允许在稳定 contract 上工作

---

## 12. 锐评结论

这套代码目前最大的问题不是“不够高级”，而是**该收口的时候没有收口**。

当前仓库最危险的地方有三条：

1. 想做“默认 Electron 主线”，但没有彻底删除 Native Host 的执行权。
2. 想做“Shared 共享层”，但真正共享的是数据外形，不是唯一规则。
3. 想做“可配置 action workbench”，但 action 真相、settings 真相、execution 真相还分散在多个实现里。

如果现在继续直接加功能，结果只会是：

- 每加一个 action，维护两到三处定义
- 每改一次 settings，担心 Swift/TS 不一致
- 每修一次 UI，担心真实行为没跟上
- 每次排障都要先判断“系统到底跑的是哪一套”

这不是“小瑕疵”，这是会让项目进入维护失控的结构性问题。

本轮必须做的不是修补，而是重置：

- 删掉不必要的中间态
- 删掉没有长期价值的兜底
- 让宿主、action、settings、queue 各自只有一个真相

只有这样，后续功能开发才会从“堆功能”变成“稳定扩展”。

---

## 13. 执行要求

后续所有实现 PR 必须在描述中明确写出：

- 本 PR 对应本 PRD 的哪个 Phase
- 修改了哪些 owner module
- 改动了哪些 contract
- 跑了哪些自动化测试
- 跑了哪些手工验证
- 没验证的是什么，为什么没验证

没有验证记录的 PR，不视为完成。
