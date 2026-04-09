# U-Right Subagent Dispatch Plan

更新时间：2026-04-05

目的：把 [2026-04-05-architecture-reset-prd.md](/Users/qingli/Projects/agent_servers/claude-uright/specs/2026-04-05-architecture-reset-prd.md) 拆成可直接派发给 subagent 的工作包。本文档只负责调度，不负责替代 PRD。

约束：

- 不接受中间态
- 不假定成功
- 不允许“代码看起来对”替代前后验证
- 每个 subagent 必须先读 PRD，再读自己负责的文件集
- 每个 subagent 输出必须包含：
  - 修改文件清单
  - 修改原因
  - 风险
  - 执行前验证
  - 执行后验证
  - 未验证项

---

## 1. 全局调度规则

### 1.1 所有 subagent 的统一输入

每个 subagent 启动时都必须收到以下输入：

- 主 PRD：
  - [2026-04-05-architecture-reset-prd.md](/Users/qingli/Projects/agent_servers/claude-uright/specs/2026-04-05-architecture-reset-prd.md)
- 当前调度文档：
  - [2026-04-05-subagent-dispatch-plan.md](/Users/qingli/Projects/agent_servers/claude-uright/specs/2026-04-05-subagent-dispatch-plan.md)
- 自己的 phase 与 work package 编号
- 自己拥有写权限的文件范围
- 明确禁止修改的文件范围

### 1.2 所有 subagent 的统一执行模板

每个 subagent 都必须按以下顺序工作：

1. 复述自己负责的 phase / work package
2. 列出会读哪些文件
3. 列出会改哪些文件
4. 执行前验证当前状态
5. 实施改动
6. 执行后跑可重复验证
7. 如验证失败，回报失败事实，不得伪造“已完成”

### 1.3 禁止项

- 不允许跨越自己被分配的文件边界
- 不允许顺手清理无关代码
- 不允许新增常驻 adapter/fallback
- 不允许把未完成能力暴露给用户
- 不允许把验证写成“理论上通过”

---

## 2. 串行门槛

以下阶段必须串行解锁：

### Gate A

- Phase 1 宿主真相收口 完成

Gate A 完成前，禁止开始以下代码改动：

- Phase 3 settings schema 写路径切换
- Phase 4 queue contract 切换
- Phase 5 以后的主执行路径替换

### Gate B

- Phase 2 action manifest 单源化 完成

Gate B 完成前，禁止开始以下代码改动：

- 任何新的 action UI/preview/execution 扩展
- settings action defaults 重写

### Gate C

- Phase 3 settings schema v3 完成
- Phase 4 queue 可靠化 完成

Gate C 完成后，才允许大规模并行拆分 Main/Renderer。

---

## 3. Phase-by-Phase 调度

## 3.1 Phase 1：宿主真相收口

目标：只有一个权威宿主，Finder 只唤醒 Electron app。

### P1-A 宿主构建链路 agent

职责：

- 收口 Electron app bundle 作为唯一产物真相源

只读文件：

- `package.json`
- `Makefile`
- `scripts/assemble_app_bundle.sh`
- `scripts/build_app.sh`
- `scripts/install_app.sh`
- `scripts/run_uright.sh`
- `scripts/package_electron_app.sh`
- `docs/current-state.md`
- `docs/operations-guide.md`

允许写文件：

- 上述脚本
- 上述文档

必须验证：

- 执行前：
  - 构建/安装脚本当前是否仍把 Native Host 当默认主宿主
- 执行后：
  - `make dev`
  - 安装后 `/Applications/U-Right.app` 的主入口是否仍为 Electron

完成定义：

- 文档与脚本都不再把 Native Host 声明为默认执行路径

### P1-B Finder 唤醒链路 agent

职责：

- 收口 Finder Extension 唤醒目标

只读文件：

- `Sources/URightFinderExtension/FinderSyncExtension.swift`
- `Resources/App/Info.plist`
- `Resources/Extension/Info.plist`
- `scripts/reload_extension.sh`
- `specs/2026-04-05-electron-host-unification.md`

允许写文件：

- 上述 Swift / plist / 脚本

必须验证：

- 执行前：
  - 当前 Finder 唤醒路径是否仍可能落到 Native Host
- 执行后：
  - Finder 真实右键一次
  - 只出现 Electron Host 日志

完成定义：

- Finder 唤醒目标唯一，且可通过日志证明

### P1-C Native Host 下线 agent

职责：

- 将 `Sources/URightHost/` 从默认产品链路中下线

只读文件：

- `Package.swift`
- `scripts/*`
- `README.md`
- `docs/*`

允许写文件：

- 上述文件

必须验证：

- 执行前：
  - Native Host 当前是否仍参与 build/install/default docs
- 执行后：
  - 默认开发链路不再依赖 Native Host action execution

完成定义：

- Native Host 仅作为 archive/reference，不再是当前执行路径

### Phase 1 并行度

- `P1-A` 与 `P1-B` 可并行探索，但最终落地必须串行合并
- `P1-C` 必须等 `P1-A` 与 `P1-B` 结果明确后再动

---

## 3.2 Phase 2：action manifest 单源化

目标：action 元数据只在一个 manifest 中存在。

### P2-A manifest schema / generator agent

职责：

- 定义 manifest schema
- 建立生成入口

只读文件：

- `electron/src/shared/action-registry.ts`
- `Sources/URightShared/ActionRegistry.swift`
- `Sources/URightShared/Generated/ActionIDs.generated.swift`
- `scripts/generate_action_ids.js`
- `scripts/validate_action_registry.js`
- `docs/action-implementation-status.md`

允许写文件：

- `manifest/*`
- `scripts/generate_action_manifest*`
- `scripts/validate_action_registry.js`
- 新增 generator support files

必须验证：

- 生成结果必须可稳定重复
- 不允许 manifest 与生成产物双写真相

完成定义：

- schema 定义完成
- generator 可输出 Swift/TS 所需中间产物

### P2-B TS registry cutover agent

职责：

- 用生成产物替换 TS 手写 action metadata

只读文件：

- `electron/src/shared/action-registry.ts`
- `electron/src/shared/defaults.ts`
- `electron/src/shared/resolved-settings.ts`
- `electron/src/renderer/App.tsx`
- `electron/src/main/action-runner/dispatcher.ts`

允许写文件：

- 上述 TS shared/main/renderer 文件

依赖：

- 必须等待 `P2-A` 先产出 manifest schema 和 generator

必须验证：

- `npm run validate:action-registry`
- TS build
- UI preview / action defaults 不漂移

完成定义：

- TS 不再手写核心 action metadata

### P2-C Swift registry cutover agent

职责：

- 用生成产物替换 Swift 手写 action metadata

只读文件：

- `Sources/URightShared/ActionRegistry.swift`
- `Sources/URightShared/Generated/*`
- `Sources/URightShared/Settings.swift`
- `Sources/URightFinderExtension/FinderSyncExtension.swift`

允许写文件：

- 上述 Swift files

依赖：

- 必须等待 `P2-A`

必须验证：

- Swift build
- Finder menu build 正常
- `open.ghostty` 等历史漂移项显式暴露出来并被处理

完成定义：

- Swift 不再手写核心 action metadata

### P2-D parity / fixtures / docs agent

职责：

- 扩展 parity check
- 建立 action fixtures
- 更新动作状态文档

只读文件：

- `scripts/validate_action_registry.js`
- `docs/action-implementation-status.md`
- `docs/current-state.md`

允许写文件：

- 上述文件
- `tests/fixtures/action-manifest/*`

依赖：

- 必须等待 `P2-B` 与 `P2-C`

必须验证：

- parity 不只校 id，还校 title/category/contexts/requirements/defaultVisible

完成定义：

- 现有“id 对了但 Finder 语义仍漂移”的问题无法再漏过

### Phase 2 并行度

- `P2-A` 串行优先
- `P2-B` 与 `P2-C` 可并行
- `P2-D` 最后串行收尾

---

## 3.3 Phase 3：settings schema v3

目标：只有一个嵌套持久化模型，不保留双轨镜像。

### P3-A schema design / fixtures agent

职责：

- 定义 `StoredSettingsV3`
- 定义 migration fixtures

只读文件：

- `electron/src/shared/contracts.ts`
- `electron/src/main/store.ts`
- `Sources/URightShared/Settings.swift`
- `electron/src/shared/defaults.ts`

允许写文件：

- settings schema files
- fixtures

必须验证：

- 明确列出要删除的扁平字段
- 明确列出 migration 输入/输出样例

完成定义：

- v3 schema 冻结

### P3-B TS repository / migration agent

职责：

- 改 TS settings load/save/migrate

只读文件：

- `electron/src/main/store.ts`
- `electron/src/shared/contracts.ts`
- `electron/src/shared/defaults.ts`
- `electron/src/shared/resolved-settings.ts`

允许写文件：

- 上述 TS 文件

依赖：

- 必须等待 `P3-A`

必须验证：

- 用旧 settings fixture 启动可迁移
- 再保存后不再写出扁平字段

### P3-C Swift repository / migration agent

职责：

- 改 Swift settings decode/save/migrate

只读文件：

- `Sources/URightShared/Settings.swift`
- `Sources/URightShared/Models.swift`

允许写文件：

- 上述 Swift 文件

依赖：

- 必须等待 `P3-A`

必须验证：

- Swift 读取迁移后结构与 TS 一致

### P3-D UI settings path correction agent

职责：

- 修复 UI 仍写旧路径或错误路径的逻辑

只读文件：

- `electron/src/renderer/App.tsx`
- 后续拆分出的 settings 窗口文件

允许写文件：

- Renderer settings 相关文件

依赖：

- 建议等待 `P3-B`

必须验证：

- 模板目录更新写入 `settings.templates.customTemplateFolder`
- 所有 nested state 更新只写真实 schema

### Phase 3 并行度

- `P3-A` 串行
- `P3-B` 与 `P3-C` 可并行
- `P3-D` 紧跟 TS schema 落地

---

## 3.4 Phase 4：request queue 可靠化

目标：request 不丢失，watcher 不是唯一语义。

### P4-A queue contract agent

职责：

- 定义 incoming/processing/done/failed contract

只读文件：

- `Sources/URightShared/Handoff.swift`
- `electron/src/main/request-watcher.ts`
- `electron/src/main/store.ts`
- `docs/operations-guide.md`

允许写文件：

- Shared contract
- docs

必须验证：

- 明确目录结构
- 明确状态转移

### P4-B Finder emitter agent

职责：

- 改 Finder request 写入逻辑

只读文件：

- `Sources/URightShared/Handoff.swift`
- `Sources/URightFinderExtension/FinderSyncExtension.swift`

允许写文件：

- 上述 Swift 文件

依赖：

- 必须等待 `P4-A`

必须验证：

- Finder 仍能写 request
- wake signal 仍有效

### P4-C Electron queue processor agent

职责：

- 用 queue processor 替换旧 watcher 语义

只读文件：

- `electron/src/main/request-watcher.ts`
- `electron/src/main/action-runner.ts`
- `electron/src/main/logs.ts`

允许写文件：

- 上述 TS 文件
- 新 queue repository / processor files

依赖：

- 必须等待 `P4-A`

必须验证：

- parse error 不丢请求
- crash 后能恢复 `processing`
- done/failed diagnostics 可见

### Phase 4 并行度

- `P4-A` 串行
- `P4-B` 与 `P4-C` 可并行

---

## 3.5 Phase 5 以后

只有在 Gate C 解锁后，才允许以下并行：

- `P5-Main-*`：Electron Main 拆分
- `P6-Renderer-*`：Renderer 分窗口拆分
- `P7-Test-*`：测试补齐
- `P7-Docs-*`：文档闭环

这些后续 work package 必须在前四个 phase 实际完成后再细化，禁止抢跑。

---

## 4. 每个 subagent 的固定验证模板

## 4.1 执行前验证

每个 subagent 必须先记录：

- 当前分支 / 工作区状态
- 目标文件当前是否存在未预期改动
- 当前行为现状是什么
- 如果现状都没确认，不允许直接写代码

## 4.2 执行后验证

每个 subagent 必须至少执行：

- 自己工作包绑定的自动化命令
- 自己工作包绑定的手工 smoke 流程
- 失败时保留失败事实

## 4.3 结果格式

每个 subagent 收尾必须输出：

- 修改文件
- 已验证内容
- 未验证内容
- 失败项
- 阻塞项

---

## 5. 当前建议的实际派发顺序

1. 先派 `P1-A`、`P1-B` 做并行探索，不落地冲突写入。
2. 汇总后派 `P1-C` 做默认链路下线。
3. Gate A 通过后，派 `P2-A`。
4. `P2-A` 完成后，并行派 `P2-B`、`P2-C`。
5. `P2-B`、`P2-C` 合并后，派 `P2-D`。
6. Gate B 通过后，派 `P3-A` 与 `P4-A`。
7. `P3-A` 完成后，并行 `P3-B`、`P3-C`，随后 `P3-D`。
8. `P4-A` 完成后，并行 `P4-B`、`P4-C`。
9. Gate C 通过后，再开放 Main/Renderer/Test/Docs 大规模并行。

---

## 6. 锐评

如果没有这份调度约束，subagent 很容易做出三类低质量行为：

- 抢跑后置 phase，最后返工
- 只改代码不做前后验证
- 在“中间态也能跑”的幻觉下继续堆 adapter

这三类行为都会直接把这次重构做废。

因此，本调度文档的价值不在“多找几个 agent 一起改”，而在于：

- 严格控制 phase 解锁
- 给每个 agent 明确文件边界
- 要求每个 agent 带着验证回报，而不是只带代码回报

没有验证的 subagent 结果，一律视为未完成。
