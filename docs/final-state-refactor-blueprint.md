# U-Right 最终态重构蓝图

更新时间：2026-04-09

状态：`Proposed Final State`

## 执行状态同步（2026-04-09）

- 已验证完成：
  `Sources/URightShared/ActionRequestWire.swift` 已改为 `makeFormatter`，`swift test` 通过；`xcodebuild -project URight.xcodeproj -scheme URightFinderSync -configuration Debug -derivedDataPath build/xcode CODE_SIGNING_ALLOWED=NO build` 通过。`electron/tsconfig.node.json` 已包含 `src/domain/**/*.ts`。`getRuntimeTemplateDefinitions` 已迁到 `electron/src/domain/actions/runtime-template-definitions.ts`，`npm run electron:build:main` 与 `npm run validate:runtime-template-owner` 通过。main 侧已有 `ActionExecutor` 与 `ConfirmationPolicy`，`npm run electron:build:main`、`npm run validate:action-dispatch-smoke`、`npm run validate:request-queue`、`node tests/validate-action-executor-confirmation.js` 通过。renderer 已新增 settings editor model 与 mutations owner；`settings-screen.tsx` 已改走 `settings-editor-selectors.ts` 的统一 view-model owner，`settings-editor-selectors.ts`、`use-context-menu-workbench.ts`、`context-menu-workbench.tsx` 已退出对 `settings-editor-projections.ts` 的主路径依赖；`node tests/validate-renderer-selector-owner.js`、`npm run electron:build:renderer` 与 `npm run validate:renderer-smoke` 于 2026-04-09 通过。Swift Finder bridge 已拆出 `FinderContextBuilder.swift`、`FinderMenuBridge.swift`、`ActionRequestWriter.swift`，`FinderSyncExtension.swift` 仅保留 Finder API bridge；`swift test` 与 `xcodebuild -project URight.xcodeproj -scheme URightFinderSync -configuration Debug -derivedDataPath build/xcode CODE_SIGNING_ALLOWED=NO build` 于 2026-04-09 再次通过。
- 进行中/未完成：
  动作规则一致性的 TS/Swift parity 验证仍未补齐到蓝图要求的同输入 leaf actions、分类归属和 disabled reason 全量对照；Finder 四类真实上下文（file / folder / multi-selection / empty-area）与 Settings 预览一致性的人工核验也仍未完成。
- 当前阻塞：
  当前主线蓝图入口已恢复为 `docs/final-state-refactor-blueprint.md`；`archive/docs/final-state-refactor-blueprint.md` 只保留转发说明。后续若继续维护两份正文，会重新引入状态漂移风险。
- 下一步：
  后续所有状态同步与协作引用统一写入 `docs/final-state-refactor-blueprint.md`；优先为 Swift / TS 动作规则补齐 parity 验证，再完成 Finder 四类真实上下文与 Settings 预览一致性的人工核验。

本文不是阶段性修补计划，也不是兼容旧实现的迁移说明。
本文定义的是当前代码库应该收敛到的最终态边界、模块责任、删除策略、设计取舍与实现要求。

## 1. 目标与约束

### 1.1 目标

本次重构只服务一个目标：

- 让 `Finder Sync Extension + Shared Core + Electron Host + Renderer` 四条主线各自只承担自己的责任。
- 让动作规则、设置规则、上下文解析、动作执行、界面状态不再跨层重复实现。
- 让系统可以在不理解历史包袱的前提下被继续开发。

### 1.2 非目标

- 不保留“双宿主”思维，不保留旧 Native Host 主线，不做兼容式兜底。
- 不继续增加 `helper / controller / workbench / registry` 这类模糊聚合文件。
- 不通过“再加一层 adapter”去包住旧逻辑。
- 不接受“先保留旧实现，再逐步替换”的长期中间态。

### 1.3 硬约束

- Finder Extension 必须保持薄，不能重新吸收复杂业务。
- 共享动作规则必须只有一个真相源，不允许 TS/Swift 再各写一份。
- Renderer 的复杂编辑态必须有统一状态模型，不允许散落 `useState` 拼接业务。
- Main 进程只做应用编排，不直接承载大块领域规则。
- 任何写文件、外部命令、窗口弹出、CLI 调用都必须通过具名服务进入，不允许散落在 handler 和 helper 中。

## 2. 当前问题总表

### 2.1 P0 问题

- `manifest`、TS `action-registry.ts`、Swift `ActionRegistry.swift`、Main handler 共同解释动作规则，动作系统没有单一真相源。
- `contracts/action-registry.ts` 同时承担合同层、领域规则、默认值工厂、动态动作扩展、Renderer inspector 投影，层次语义失真。
- Action handler 同时承担 UI 输入、业务判断、文件写入、设置修改、外部命令执行、结果反馈，无法测试也无法复用。
- `command-helpers.ts` 已经成为全局耦合入口，破坏模块边界。

### 2.2 P1 问题

- `SettingsScreen` 与 `ContextMenuWorkbench` 仍然是状态泥球，状态归属和视图归属没有分开。
- IPC 注册、窗口管理、结果会话、请求队列都是过程式堆叠，应用边界没有真正建立。
- Finder Extension 仍偏厚，菜单构建、快照、副作用、宿主唤醒混在一个入口类里。
- Settings 持久化是全量 JSON 比对 + 自动保存，语义粗糙，难以做事务化编辑和局部校验。

### 2.3 P2 问题

- 类型系统开始退化，出现 `any`、强制断言、字符串硬转枚举。
- 日志、错误映射、确认策略、工具可用性策略没有统一入口。
- 一些基础设施代码用同步 IO 并不是最核心问题，但当前缺少边界后续会让它们越来越危险。

## 3. 设计总原则

### 3.1 只保留职责词，不保留模糊词

后续目录和文件命名只允许使用能表达责任的词：

- `domain`
- `usecase`
- `repository`
- `gateway`
- `presenter`
- `policy`
- `service`
- `factory`
- `reducer`
- `selector`

明确禁止继续新增以下命名作为复杂逻辑容器：

- `helpers`
- `workbench`
- `controller`
- `misc`
- `utils` 作为领域实现承载点
- `registry` 但内部实际装的是规则引擎和视图投影

### 3.2 规则与副作用必须分离

- “动作可不可见、归属哪个分类、顺序是什么、当前上下文下是否启用”属于领域规则。
- “弹窗、写文件、打开窗口、调用 CLI、写日志、watch 目录”属于副作用。
- 这两类逻辑不允许继续写在一个函数里。

### 3.3 最终态优先于兼容态

对每个问题，都只选择一种最终态所有权，不保留双写、双读、并存解释器。

## 4. 最终态目录与模块边界

以下是推荐的最终态结构，只保留真正活跃的主线与责任边界。

```text
electron/src/
  contracts/
    contracts.ts
    generated/
      action-manifest.ts

  domain/
    actions/
      action-definition.ts
      action-catalog.ts
      dynamic-action-expander.ts
      action-availability-service.ts
      action-menu-projection-service.ts
      action-placement-service.ts
      action-policies.ts
    context/
      finder-context.ts
      finder-context-resolver.ts
      target-resolution-policy.ts
    settings/
      settings-model.ts
      settings-normalizer.ts
      settings-history-policy.ts

  application/
    actions/
      execute-action-usecase.ts
      action-executor.ts
      commands/
        create-file-action.ts
        create-folder-action.ts
        format-json-action.ts
        ask-claude-action.ts
        ask-codex-action.ts
    requests/
      process-request-queue-usecase.ts
    settings/
      load-settings-usecase.ts
      save-settings-usecase.ts
      restore-settings-usecase.ts
    diagnostics/
      load-diagnostics-usecase.ts
    windows/
      open-prompt-usecase.ts
      open-result-usecase.ts

  infrastructure/
    filesystem/
      file-system-service.ts
      settings-repository.ts
      request-repository.ts
      finder-snapshot-repository.ts
    runtime/
      shared-paths.ts
      runtime-paths.ts
    tools/
      tool-detection-service.ts
      cli-tool-runner.ts
    logging/
      logger.ts
    electron/
      prompt-gateway.ts
      result-presenter.ts
      dialog-gateway.ts
      clipboard-gateway.ts
      window-factory.ts
      window-registry.ts
      result-session-service.ts
      prompt-session-service.ts

  bootstrap/
    composition-root.ts
    ipc/
      register-settings-ipc.ts
      register-diagnostics-ipc.ts
      register-logs-ipc.ts
      register-dialog-ipc.ts
      register-result-ipc.ts

electron/src/renderer/
  features/settings/
    model/
      settings-editor-state.ts
      settings-editor-actions.ts
      settings-editor-reducer.ts
      settings-editor-selectors.ts
    containers/
      settings-screen-container.tsx
      context-menu-workbench-container.tsx
    components/
      category-list-panel.tsx
      action-list-panel.tsx
      action-inspector-panel.tsx
      finder-snapshot-panel.tsx
      open-action-editor-panel.tsx
      template-editor-panel.tsx

Sources/URightShared/
  Domain/
    ActionCatalog.swift
    DynamicActionExpander.swift
    ActionAvailabilityService.swift
    ActionMenuProjectionService.swift
    FinderContextResolver.swift
    SettingsNormalizer.swift
  Infrastructure/
    SharedPaths.swift
    SettingsStore.swift
    ActionHandoff.swift

Sources/URightFinderExtension/
  FinderSyncExtension.swift
  FinderContextBuilder.swift
  FinderMenuBridge.swift
  FinderSnapshotWriter.swift
  HostWakeService.swift
```

## 5. 问题一：动作规则真相源分裂

### 5.1 当前问题

当前动作规则至少散在以下地方：

- `manifest/actions.json`
- `electron/src/contracts/action-registry.ts`
- `Sources/URightShared/ActionRegistry.swift`
- Main 侧各个 action handler 的前置条件
- Renderer 的 settings/workbench 推导逻辑

这是当前代码库最危险的问题。

### 5.2 为什么必须修改

- 同一规则出现两次，迟早漂移。
- 漂移一旦发生，不会表现为编译错误，而是行为错误。
- Finder 菜单与 Settings 预览不一致，用户看到的是产品 bug，开发者看到的是调试地狱。

### 5.3 可选策略

策略 A：继续保持 TS/Swift 各自实现，只靠测试约束一致。

- 优点：改动表面较小。
- 缺点：根问题没消失，后续新增规则继续双写。
- 坑点：测试只能兜底，不能消灭结构性重复。

策略 B：把所有规则都收进 TS，Swift 只消费 TS 结果。

- 优点：理论上单一真相源。
- 缺点：Finder Extension 是原生入口，菜单构建需要原生可直接消费的规则输入。
- 坑点：会引入运行时跨桥依赖，破坏 Finder 薄而稳定的目标。

策略 C：Manifest 只保留静态元数据，TS/Swift 各自消费同一套生成后的领域输入结构，并分别实现最小规则投影服务。

- 优点：静态定义、动态扩展、可用性规则边界可以明确。
- 缺点：仍需要双语言实现一部分逻辑。
- 坑点：如果不严格限定“哪些逻辑允许双实现”，还是会回到现在的混乱。

### 5.4 选择策略

选择策略 C，但附加两条硬规则：

- 允许双语言实现的只有“纯领域投影服务”，不允许各层再嵌入额外隐式规则。
- TS/Swift 必须共享同一份 generated input，并建立 parity 验证。

### 5.5 最终态设计

动作系统拆成 4 个清晰组件：

- `ActionCatalog`
  只承载静态定义和生成产物，不承载运行时推导。

- `DynamicActionExpander`
  只负责把用户模板、自定义 open action、脚本动作扩展成运行时动作定义。

- `ActionAvailabilityService`
  只负责基于上下文和设置计算 availability。

- `ActionMenuProjectionService`
  只负责把运行时动作定义投影成 Finder/Renderer 可消费的 menu tree。

### 5.6 实现细节

- `manifest` 生成字段只保留静态字段：ID、title、icon、默认分类、默认排序、childrenPolicy、requirements。
- 用户模板、自定义 open action、脚本动作不再散落在 handler 或 UI 中解释，统一进入 `DynamicActionExpander`。
- Renderer 不再直接调用 `contracts/action-registry.ts` 里的大杂烩函数，而是调用 domain selector / projection。
- Swift `URightShared` 拥有和 TS 同名同责任的四个 domain service，不允许 Extension 类再写额外判断。

### 5.7 优雅性理由

- 把“定义、扩展、评估、投影”拆开后，每个对象只有一个变化原因。
- 新增规则只会改 `ActionAvailabilityService` 或 `DynamicActionExpander`，不会在 UI、Finder、handler 三处打补丁。

### 5.8 潜在坑点与防护

- 坑点：动态动作排序与静态动作排序冲突。
  解决：动态动作必须有单独排序区间和稳定 ID 规则。

- 坑点：TS/Swift 规则实现再次漂移。
  解决：对同一 fixtures 输入，要求两侧输出相同 leaf action set、category placement、disabled reason。

## 6. 问题二：`contracts/action-registry.ts` 语义失真

### 6.1 当前问题

当前这个文件名看起来像“合同层”，实际上承载了：

- 领域规则
- 默认值工厂
- 动态模板定义
- 动作可见性判断
- Renderer inspector 数据构造
- 排序与 placement 解释

这会误导后续开发者继续把复杂度塞进去。

### 6.2 可选策略

策略 A：保留文件名，继续拆内部函数。

- 优点：改动名义最小。
- 缺点：文件名和层语义继续骗人。

策略 B：直接拆回 `domain/` 与 `contracts/`。

- 优点：边界最清楚。
- 缺点：引用面会变化较大。

### 6.3 选择策略

选择策略 B。

### 6.4 最终态设计

- `contracts/` 只保留共享类型、IPC payload、generated data。
- 所有运行时规则迁入 `domain/actions/`。
- 所有 renderer inspector/view model 推导迁入 `renderer/features/settings/model/selectors`。

### 6.5 明确删除

以下职责必须从 `contracts/` 中移除：

- `evaluateActionAvailability`
- `buildSettingsCategoryWorkbenchItems`
- `buildSettingsActionInspectorItems`
- `getRuntimeTemplateDefinitions`
- `moveActionInWorkbench`
- `applyActionPatch`
- `applyCategoryPatch`

原因很简单：

- 前三者是领域投影和 UI 投影。
- `getRuntimeTemplateDefinitions` 是领域扩展逻辑。
- 后三者是 Renderer 编辑域里的状态变更逻辑。

## 7. 问题三：Action Handler 太胖，执行模型过于脚本化

### 7.1 当前问题

当前 handler 普遍同时处理：

- 输入解析
- prompt
- 权限判断
- 文件系统操作
- 设置更新
- 外部进程调用
- 结果展示

这不是“动作执行器”，而是脚本式流程片段。

### 7.2 为什么必须修改

- 任何动作都无法脱离 Electron 环境测试。
- 同类流程无法复用。
- 错误处理、确认策略、审计日志只能靠复制粘贴。

### 7.3 可选策略

策略 A：保留函数式 handler，只把公共逻辑继续提到 helper。

- 优点：开发速度快。
- 缺点：继续制造 God Helper。

策略 B：维持 `Record<string, ActionHandler>`，但每个 handler 内部调用 service。

- 优点：比现在好。
- 缺点：dispatch 结构仍然扁平，执行策略、前置策略、确认策略仍难统一管理。

策略 C：动作改成命令对象，由 `ActionExecutor` 调度，副作用全部通过 port/service 注入。

- 优点：边界最清晰，测试最稳定。
- 缺点：初次重构工作量较大。

### 7.4 选择策略

选择策略 C。

### 7.5 最终态设计

- `ActionExecutor`
  负责 action id 到 command 的分发。

- `ActionCommand`
  统一接口：`execute(context): Promise<ActionResult>`

- `Ports`
  包括：
  - `PromptGateway`
  - `FileSystemService`
  - `ToolRunner`
  - `SettingsRepository`
  - `ResultPresenter`
  - `Logger`

### 7.6 实现细节

- 每个动作一个类，不再按 `commands/file.ts`、`commands/ai.ts` 这种大类文件横向堆。
- destructive 行为不在各个动作里自写确认弹窗，统一走 `ConfirmationPolicy`。
- “写结果窗口”、“写回文件”、“打开外部 CLI”这类 UI/infra 行为全部通过 port 进入。
- `ActionExecutionContext` 只保留领域输入，不夹带 Electron 实体对象。

### 7.7 优雅性理由

- 用例边界清楚。
- 动作逻辑自然支持复用。
- CLI 动作、文件动作、AI 动作都能复用同一组副作用服务。

### 7.8 潜在坑点与防护

- 坑点：命令类太多。
  解决：只对真正独立的用户动作建类；纯别名动作可由同一 command + 参数化工厂生成。

- 坑点：依赖注入过度复杂。
  解决：只在 `composition-root` 装配，不引入 DI 框架。

## 8. 问题四：`command-helpers.ts` 是边界污染源

### 8.1 当前问题

这个文件把路径解析、模板、prompt、tool detection、命令流输出混在一起，是典型的无边界聚合点。

### 8.2 选择策略

不保留，不重命名，不继续拆小函数。

直接删除，按责任重建：

- `finder-context-resolver.ts`
- `file-system-policy.ts`
- `template-catalog-service.ts`
- `tool-launch-service.ts`
- `prompt-gateway.ts`
- `command-output-streamer.ts`

### 8.3 为什么这是最终态

- helper 名称本身就在鼓励偷渡职责。
- 具名服务会强迫开发者先想清楚这段逻辑属于哪一层。

### 8.4 潜在坑点

- 坑点：拆完后文件数变多。
  解决：文件变多不是问题，职责混乱才是问题。每个文件只保留一个理由变化。

## 9. 问题五：Renderer 设置页不是页面，是状态泥球

### 9.1 当前问题

`SettingsScreen` 和 `ContextMenuWorkbench` 同时承载：

- 编辑状态
- 选中状态
- 拖拽状态
- 派生视图
- 配置修改逻辑
- 子编辑器协调逻辑

### 9.2 可选策略

策略 A：继续拆 JSX 组件。

- 优点：看起来文件会变小。
- 缺点：状态仍然是泥球，只是 props 更长。

策略 B：提取几个 hook。

- 优点：比纯拆 JSX 稍好。
- 缺点：复杂度只是从组件挪到 hook，状态边界仍不明确。

策略 C：建立统一 editor model，所有变更通过 reducer/action/selectors 驱动，再配容器组件和纯展示组件。

- 优点：边界最清晰，可测试性最好。
- 缺点：需要重写当前页面的状态流。

### 9.3 选择策略

选择策略 C。

### 9.4 最终态设计

`settings-editor-state` 只包含：

- 当前 section
- 当前选中项
- 当前拖拽态
- 当前待编辑文档
- 当前 diagnostics / snapshot 只读视图
- dirty / saving / error 等编辑状态

`settings-editor-actions` 只表达行为：

- `selectCategory`
- `selectAction`
- `toggleCategory`
- `toggleAction`
- `moveAction`
- `moveCategory`
- `editOpenAction`
- `addTemplate`
- `removeTemplate`

`selectors` 只负责派生：

- category list
- action list
- selected inspector model
- snapshot diff
- save banner state

### 9.5 组件边界

- Container 组件只连接 reducer、selectors、API。
- Presentational 组件只接收 typed props，不直接修改 settings 文档。

### 9.6 为什么这才优雅

- 状态修改入口唯一。
- 复杂交互可以做 reducer 单测。
- 视图组件不再知道业务规则。

### 9.7 潜在坑点

- 坑点：一次性改动较大。
  解决：这是最终态文档，目标本来就是直接进入正确结构，不再围绕旧组件继续修修补补。

## 10. 问题六：Settings 持久化语义粗糙

### 10.1 当前问题

当前做法是：

- 加载一份 settings
- 改动后 `JSON.stringify`
- 全量 debounce 保存
- 再全量拉 previous 与 diagnostics

这不适合作为长期编辑模型。

### 10.2 可选策略

策略 A：保留自动保存，只优化 debounce。

- 优点：改动小。
- 缺点：没有解决编辑模型问题。

策略 B：切成显式 Apply/Save。

- 优点：语义清晰。
- 缺点：会改变产品交互。

策略 C：保留自动保存体验，但内部改成“编辑文档 + 归一化保存 + save transaction state”。

- 优点：兼顾产品体验和工程可维护性。
- 缺点：需要明确 dirty/save/failure 语义。

### 10.3 选择策略

选择策略 C。

### 10.4 最终态设计

- Renderer 内部维护 `editingSettings`，不是直接把“已持久化状态”当工作状态。
- 保存时走 `SaveSettingsUseCase`，内部：
  - normalize
  - validate
  - snapshot previous
  - persist current
  - return canonical saved document
- diagnostics 不在每次保存后盲拉全量，只在需要刷新时显式触发。

### 10.5 优雅性理由

- 保存语义清晰。
- 便于引入字段级校验和保存错误定位。
- 不再依赖全量对象字符串比较。

## 11. 问题七：Main 进程是过程式拼装，不是清晰应用层

### 11.1 当前问题

`ipc.ts`、`window-controller.ts`、`request-queue.ts` 都是“功能能跑，但边界模糊”的过程式实现。

### 11.2 最终态设计

#### IPC

按能力域拆：

- settings IPC
- diagnostics IPC
- logs IPC
- dialog IPC
- result IPC
- clipboard IPC

`bootstrap/composition-root.ts` 只负责创建依赖、注册这些模块。

#### Window

拆成：

- `WindowFactory`
  只负责 BrowserWindow 创建参数和 URL/preload 绑定

- `WindowRegistry`
  只负责 settings/logs/onboarding 单例窗口引用

- `PromptSessionService`
  只负责 prompt resolve/reject 生命周期

- `ResultSessionService`
  只负责 result payload、stream append、status update

#### Request Queue

拆成：

- `RequestRepository`
  只处理 incoming/processing/done/failed 文件语义

- `ProcessRequestQueueUseCase`
  只做“取请求 -> 执行动作 -> 写摘要”

- `RequestWatcher`
  只做 watch + backpressure 调度

### 11.3 为什么这样设计

- 让主进程每个子系统都只有一个清晰 owner。
- 让单元测试可以脱离 Electron 对象测试应用逻辑。

## 12. 问题八：Finder Extension 还不够薄

### 12.1 当前问题

当前 Extension 类里同时承担：

- context 构建
- 菜单描述生成
- item 绑定
- request 保存
- 快照落盘
- host 校验与唤醒

### 12.2 可选策略

策略 A：继续保留一个主类，只做内部私有函数拆分。

- 优点：改动表面小。
- 缺点：逻辑 owner 仍然是 Extension 本身。

策略 B：把逻辑拆到服务，Extension 只保留 Finder API bridge。

- 优点：最符合产品架构方向。
- 缺点：Swift 文件数会变多。

### 12.3 选择策略

选择策略 B。

### 12.4 最终态设计

- `FinderContextBuilder`
  从 Finder API 构建标准 `FinderActionContext`

- `FinderMenuBridge`
  根据 `ActionMenuProjectionService` 输出构建 NSMenu / NSMenuItem

- `ActionRequestWriter`
  保存 request handoff

- `FinderSnapshotWriter`
  负责快照写入

- `HostWakeService`
  负责宿主校验与唤醒

`FinderSyncExtension` 本身只做：

1. 获取当前 Finder 原始数据
2. 调 `FinderContextBuilder`
3. 调 `ActionMenuProjectionService`
4. 调 `FinderMenuBridge`
5. 在点击后调 `ActionRequestWriter` 与 `HostWakeService`

### 12.5 Snapshot 策略

不采用“Host 需要时再请求 Finder 生成快照”的方案。

原因：

- 这会引入 Host -> Extension 的反向时序耦合。
- Finder 当前上下文本来就是菜单构建时天然可得的，快照应是构建阶段副产物。
- 设置页需要的是“最近一次真实菜单事实”，不是延迟请求得到的模拟状态。

最终态要求：

- 菜单构建结束后异步持久化快照。
- Snapshot 写入失败不影响菜单显示。
- Snapshot 只用于诊断和对照，不参与菜单主逻辑。

## 13. 问题九：规则表达方式需要“可组合”，但不需要类爆炸

### 13.1 当前问题

`ActionAvailabilityEvaluator` 现在是 guard/if 链条，后续扩展会越来越长。

### 13.2 可选策略

策略 A：继续 if/else。

- 优点：简单直接。
- 缺点：增长后必炸。

策略 B：完整 Specification Pattern，每条规则一个 class。

- 优点：理论上可组合。
- 缺点：对当前规模容易类爆炸，阅读成本上升。

策略 C：使用“声明式规则列表 + 小型 policy object”，在 service 内组合执行。

- 优点：既可组合，又避免类爆炸。
- 缺点：需要先设计清楚规则输入结构。

### 13.3 选择策略

选择策略 C。

### 13.4 最终态设计

每个动作定义包含声明式 requirements：

- `requiresSingleSelection`
- `requiresWritableTarget`
- `requiresDirectoryContext`
- `requiredTool`
- `requiresAI`

`ActionAvailabilityService` 内部使用具名 policy：

- `ContextSupportPolicy`
- `WritableTargetPolicy`
- `AIAvailabilityPolicy`
- `ToolAvailabilityPolicy`
- `VisibilityPolicy`

这些 policy 是小对象或纯函数模块，不强制每条规则一个 class。

### 13.5 为什么选择它

- 比 if/else 更可扩展。
- 比满地 Specification class 更轻。
- 更符合这个项目当前的复杂度级别。

## 14. 问题十：类型边界和生成契约需要重新收紧

### 14.1 当前问题

- Renderer 出现 `any`
- 大量 `string as xxx`
- 一些 view model 与 domain model 混用

### 14.2 最终态设计

- 所有 menu snapshot、selector 输出、editor state 都必须有独立显式类型。
- 不允许 UI 组件直接消费领域原始模型再现场解释。
- generated manifest 只生成原始动作定义，不生成 UI 专用派生模型。

### 14.3 明确禁止

- `any`
- `as unknown as`
- 用字符串字面量直接驱动分类和动作类型判断
- 在组件 props 中塞入“半完成对象”

## 15. 需要直接删除的旧设计

以下内容不应进入最终态，应直接删除或重写：

- `electron/src/contracts/action-registry.ts` 作为复杂逻辑容器的现有角色
- `electron/src/main/application/actions/command-helpers.ts`
- `Record<string, ActionHandler>` 作为动作系统长期核心模型
- `ContextMenuWorkbench` 作为单体业务组件的现有结构
- `SettingsScreen` 内部分散 `useState` + 手工 patch 的编辑模型
- `window-controller.ts` 当前聚合式设计
- `bootstrap/ipc.ts` 当前平铺注册方式

## 16. 为什么选择这套方案

### 16.1 这套方案优于“继续局部拆文件”

因为局部拆文件解决的是体积，不解决所有权。

### 16.2 这套方案优于“先保留旧逻辑再套 adapter”

因为 adapter 套旧逻辑只会制造双层复杂度，不会降低耦合。

### 16.3 这套方案优于“全面模式化重写”

因为这里只采用了必要的模式：

- Command
- Repository
- Factory
- Reducer
- Policy Object
- Composition Root

没有为了模式而模式。

### 16.4 这套方案优于“只做 TS 侧重构”

因为当前最大问题本来就是 TS/Swift 规则分裂，只重构一侧没有意义。

## 17. 实施要求

虽然本文不是中间态方案，但真正落地时必须遵守以下规则：

- 每一次提交都直接落在最终态目录和边界上，不新增临时桥接层。
- 新代码只允许写入最终 owner 模块，不允许在旧文件里继续扩展。
- 每完成一个领域块，必须立刻补同输入下的 TS/Swift parity 验证。
- 在最终态域服务落地前，不再新增新的动作规则或新的 settings 编辑能力。

## 18. 验证要求

最终态必须至少通过以下验证：

### 18.1 动作规则一致性

- 同一 settings + context 输入下，TS 与 Swift 输出相同 leaf actions
- 分类归属一致
- disabled reason 一致

### 18.2 Finder 主线

- file
- folder
- multi-selection
- empty-area

以上四类上下文，Finder 实际菜单与 Settings 预览一致。

### 18.3 Action 执行

- destructive action 必须经过统一确认策略
- AI 动作在 CLI-present / CLI-missing 两种路径下行为稳定
- 文件动作可单测，不依赖真实 Electron UI 环境

### 18.4 Renderer 编辑态

- reducer 对 category reorder / action reorder / toggle / edit custom action 有单测
- selector 对 inspector / snapshot diff / enabled count 有单测

## 19. 最终结论

这个项目现在最需要的不是“把几个大文件再切一切”，而是：

- 收回动作规则真相源
- 收回状态所有权
- 收回应由应用层持有的流程编排
- 收回基础设施副作用入口

真正优雅的设计，不是文件看起来更碎，而是：

- 每条规则有唯一 owner
- 每个状态有唯一归属
- 每个动作有唯一执行入口
- 每个副作用有唯一边界

U-Right 的最终态不应该是“Electron + Swift 混着也能跑”，而应该是：

- Finder Extension 只做原生桥
- Shared Core 只做规则与模型
- Electron Main 只做用例编排
- Renderer 只做编辑态与展示

这才是后续可以持续扩展、持续验证、持续维护的架构。
