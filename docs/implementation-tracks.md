# U-Right 并行开发轨道

更新时间：2026-04-03

本文档描述当前轮次可并行推进的轨道、边界和验收标准，避免多人改动时的语义漂移。

## 总原则

- 默认主线：`Finder Sync Extension + Electron Host + Shared`
- 新动作先过 registry，再补执行，再补验证
- 未完成动作继续隐藏，不用文档替代实现
- 结构问题优先做“一次到位”的重构，避免中间适配层长期残留

---

## Track A：Action Runner 结构化拆分（进行中）

### 目标

将当前 dispatcher 进一步按业务域拆分，确保新增动作不再放大核心文件复杂度。

### 当前状态

- 已完成：`action-runner.ts` 薄入口 + `dispatcher.ts` 统一分发
- 待完成：`dispatcher.ts` 按域拆分 `handlers/` 文件

### 范围

- 抽离 `copy` / `create` / `open` / `file` / `view` / `git` / `ai` / `script` handler 模块
- 保持外部行为不变
- 统一错误和日志边界

### 验收条件

- 新增动作只需新增 handler 或注册，不修改核心入口
- `electron:build:main` 通过
- 动作 smoke 覆盖关键分支

---

## Track B：Settings 单轨模型持续收口（进行中）

### 目标

巩固结构化 settings 单轨模型，避免 legacy 回流。

### 当前状态

- 已完成：`AppSettings` 结构化强制字段；移除 legacy 双轨同步
- 待完成：补充迁移/降级策略说明与测试样例

### 范围

- 所有读取统一走结构化字段
- 对历史配置仅允许一次归一化迁移
- 禁止新增 legacy 顶层字段读写

### 验收条件

- 代码中不再出现 legacy 字段 fallback 逻辑
- `electron:build` 通过
- 设置变更可在 UI / 执行链路一致体现

---

## Track C：Registry 真单源治理（进行中）

### 目标

确保动作 ID 与核心声明只在单源维护，跨端产物自动生成。

### 当前状态

- 已完成：TS -> Swift ActionIDs 自动生成
- 已完成：校验链路改为“先生成再校验”
- 待完成：把生成纳入 release/checklist 固定流程

### 范围

- 维护 `scripts/generate_action_ids.js`
- 维护 `scripts/validate_action_registry.js`
- 保证生成产物可追溯且可重复

### 验收条件

- `npm run validate:action-registry` 稳定通过
- 手工修改 TS action id 后可自动同步 Swift 产物
- 不再手工维护 Swift ActionIDs

---

## Track D：验证与文档闭环（进行中）

### 目标

把工程真实状态沉淀为可执行的验证流程与文档，减少口头同步成本。

### 范围

- 维护项目进展、实现轨道、动作状态、硬化报告
- 固化手动验证清单
- 对每次结构改造给出命令级验收步骤

### 验收条件

- 文档间叙事一致（进展、轨道、状态、硬化）
- 验证命令可直接运行
- 不写“计划完成”，只写“已完成/进行中/未完成”

---

## 依赖关系

- Track A 与 Track B 可并行
- Track C 为 A/B 提供稳定跨端契约
- Track D 贯穿全程，负责可验证交付

合并前需要一次对齐：

1. 哪些动作已真实完成
2. 哪些设置已真实生效
3. 哪些动作默认可见
4. 对应验证命令和手动回归项是否齐全

---

## 本轮建议合并顺序

1. Shared/Registry 变更（单源与生成）
2. Host 执行器结构化变更（dispatcher/handlers）
3. Settings 收口与 UI 对齐
4. 文档与验证清单更新
