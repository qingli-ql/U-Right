# P0/P1 问题收敛执行与验收（2026-04-03）

本文档记录已落地修复、方案取舍、以及可验证验收方式。

## 范围

- P0-1：App Group 分叉与 fallback 引发的容器不一致
- P0-2：Swift / Electron Action Registry 双维护漂移风险
- P0-3：仓库构建产物噪音导致版本污染
- P1-1：`action-runner.ts` 职责过载（超长 switch）
- P1-2：设置模型 legacy + 新结构双轨复杂度

---

## P0-1：App Group 分叉（已完成）

### 选型

严格模式（缺失即失败），legacy 仅迁移，不再长期 fallback。

### 已落地

- `electron/src/main/store.ts`
  - `resolveAppGroupIdentifier()` 仅接受明确注入值，不再静默 fallback。
  - legacy 组（`group.com.openai.uright`）拒绝启动。
  - `resolveSharedRoot()` 固定使用 Group Containers。
- `scripts/app_group_id.sh`
  - 未检测到 team 时默认失败。
  - 仅 `URIGHT_ALLOW_LEGACY_APP_GROUP` 显式设置时允许 legacy。

### 验证

1. 缺失 app group 时启动应失败。
2. 强制 legacy app group 时启动应失败。
3. 正常 team-based app group 启动成功并在对应容器产出 snapshot。

---

## P0-2：Action Registry 单源推进（已完成）

### 问题根因

TS/Swift 双写，靠人工同步，长期必漂移。

### 最终方案（一步到位）

**TS 为单源，Swift ActionIDs 自动生成。**

### 已落地

- 新增 `scripts/generate_action_ids.js`
  - 从 `electron/src/shared/action-registry.ts` 的 `ACTION_DEFINITIONS` 提取 id
  - 生成 `Sources/URightShared/Generated/ActionIDs.generated.swift`
- `Sources/URightShared/ActionRegistry.swift`
  - 移除手写 `ActionIDs`，改用生成文件
- `scripts/validate_action_registry.js`
  - 对比改为：TS definitions ↔ 生成后的 Swift ActionIDs
- `package.json`
  - 新增 `generate:action-ids`
  - `validate:action-registry` 改为先生成后校验

### 验证

```bash
npm run validate:action-registry
```

预期：

- 自动生成 Swift ActionIDs
- 输出 `Action registry parity OK ...`

---

## P0-3：仓库 hygiene（已完成）

### 已落地

- `.gitignore` 增加 SwiftPM/Xcode/Electron 常见噪音路径。
- 已执行索引清理：历史被跟踪构建产物移出版本控制（保留本地文件）。

### 验证

```bash
git status --short
```

预期：不再出现 `.build/.swiftpm/xcuserdata` 等构建噪音新增追踪。

---

## P1-2：设置模型双轨复杂度（已完成）

### 问题根因

`AppSettings` 同时维护 legacy 顶层字段 + 新领域结构，normalize 需要双向映射，容易隐性不一致。

### 最终方案（一步到位）

仅保留领域结构，去除运行时双轨同步。

### 已落地

- `electron/src/shared/contracts.ts`
  - `AppSettings` 改为强制结构化字段：
    - `general / integrations / templates / ai / customActions / advanced`
- `electron/src/shared/resolved-settings.ts`
  - 去除 legacy fallback 读取。
- `electron/src/main/store.ts`
  - `normalizeSettings()` 改为结构化归一化，不再双向同步 legacy 顶层字段。
- `electron/src/renderer/App.tsx`
  - UI 读写迁移到 `settings.ai.* / settings.integrations.* / settings.general.*`。
- `electron/src/main/action-runner.ts` / `electron/src/shared/action-registry.ts`
  - 删除对 legacy 顶层字段访问。

### 验证

```bash
npm run electron:build
```

预期：main/renderer 全量编译通过。

---

## P1-1：Action Runner 过载（已完成）

### 问题根因

单文件超长 switch 承担路径解析、权限检查、UI、业务、AI 调用；新增动作牵一发而动全身。

### 最终方案（一步到位）

**Dispatcher + Handler Registry**，入口只负责日志与错误边界。

### 已落地

- 新增 `electron/src/main/action-runner/dispatcher.ts`
  - 集中分发：
    - 固定 action id -> handler map
    - 前缀路由：`create.template.`* / `open.custom.*` / `script.run.*`
- `electron/src/main/action-runner.ts`
  - 改为薄入口：
    - 读取 settings
    - 统一日志
    - 调用 dispatcher
    - 错误边界

### 验证

```bash
npm run electron:build:main
npm run electron:build:renderer
```

预期：编译通过，且菜单动作能正常分发。

---

## 本轮执行结果

已执行并通过：

- `npm run validate:action-registry` ✅
- `npm run electron:build:main` ✅
- `npm run electron:build:renderer` ✅
- `npm run electron:build` ✅
- 相关文件 lint ✅

补充说明：

- Action IDs 现已由 TS 单源自动生成 Swift 产物；禁止手写维护 Swift ActionIDs。
- Action Runner 已完成“薄入口 + dispatcher”第一阶段重构，后续按域拆分 handlers。

---

## 验收清单（手动）

1. Finder 触发 `copy.path`、`copy.filename`、`open.terminal` 正常。
2. `create.new-file`、`create.new-folder` 能创建目标。
3. `file.rename`、`file.trash`、`file.duplicate` 正常。
4. `ai.ask-claude` / `ai.ask-codex` 在 CLI 可用时可流式输出。
5. `script.run.*` 可执行且结果窗口输出正常。
6. 变更 Action ID（TS）后执行 `npm run validate:action-registry` 可自动生成并保持一致。

