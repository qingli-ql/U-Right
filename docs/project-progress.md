# U-Right 项目进度

更新时间：2026-04-03

本文档记录当前真实状态（以 Electron 主线为准），并同步 P0/P1 收敛结果。

## 当前结论

项目处于 **可运行原型（Hardening 中）** 阶段，核心链路已打通且进入结构化治理：

- Finder Extension 菜单生成稳定
- Electron Host 请求监听与执行链路稳定
- Settings / Prompt / Result / Logs 可用
- P0 问题已完成收敛
- P1 关键结构问题已完成第一轮重构

当前默认主线：

- `Finder Sync Extension`
- `Electron Host`
- `Shared`（动作定义、评估、设置模型）

---

## 本轮（2026-04-03）新增完成

### 1) App Group 严格化（P0）

- 移除隐式 fallback 行为
- legacy app group 默认拒绝
- 仅允许明确配置的 team-based group

### 2) Action Registry 单源落地（P0）

- TS 成为动作 ID 单源：`electron/src/shared/action-registry.ts`
- 新增自动生成：`scripts/generate_action_ids.js`
- 生成 Swift 产物：`Sources/URightShared/Generated/ActionIDs.generated.swift`
- 校验链路升级：`validate:action-registry` 先生成再校验

### 3) 设置模型单轨化（P1）

- `AppSettings` 收敛为领域结构：
  - `general`
  - `integrations`
  - `templates`
  - `ai`
  - `customActions`
  - `advanced`
- 去除 legacy 顶层字段双轨同步
- `normalizeSettings()` 转为结构化归一化

### 4) Action Runner 解耦（P1）

- `electron/src/main/action-runner.ts` 收敛为薄入口
- 分发迁移到 `electron/src/main/action-runner/dispatcher.ts`
- 引入：
  - 固定 action 映射
  - 前缀路由（`create.template.*` / `open.custom.*` / `script.run.*`）

---

## 已接通动作（Electron 主线）

- `create.new-file`
- `create.new-folder`
- `create.template.*`
- `open.terminal`
- `open.vscode`
- `open.cursor`
- `open.zed`
- `open.custom.*`
- `copy.path`
- `copy.relative-path`
- `copy.filename`
- `copy.basename`
- `copy.extension`
- `finder.reveal`
- `view.refresh`
- `view.toggle-hidden`
- `file.rename`
- `file.trash`
- `file.duplicate`
- `file.compress`
- `file.json-format`
- `file.toggle-executable`
- `git.status`
- `ai.ask-claude`
- `ai.ask-codex`
- `script.run.*`

---

## 部分完成（可用但仍需加强）

### Context Menu 工作台

- 分类排序、动作排序、跨分类移动可用
- `inline/submenu`、`collapseSingleActionGroups`、`showUnavailableInPreview` 已可用
- 仍是一层工作台，不是多级子菜单编辑器

### AI 能力

- Claude/Codex CLI 优先，API fallback 可用
- Prompt 可编辑，Result 可保存/回写
- 高级 AI 动作仍默认隐藏

### 模板 / 自定义动作 / 脚本

- 模板、自定义打开、脚本动作已进入统一执行链路
- 配置体验仍偏 MVP

---

## 未完成

### 高优先级动作缺口

- `folder.search`
- `folder.size`
- `folder.count`
- `multi.batch-rename`

### 高级 AI 动作（已注册，默认隐藏）

- `ai.explain-project`
- `ai.summarize-files`
- `ai.generate-readme`
- `ai.generate-gitignore`
- `ai.review-code`
- `ai.refactor-file`
- `ai.write-tests`
- `ai.explain-error`
- `ai.json-schema`
- `ai.commit-message`
- `ai.pr-summary`
- `ai.summarize-selection`
- `ai.ask-selection`
- `ai.repeat-last`

### 发布链路

- Developer ID 签名
- notarization
- staple
- 发布产物校验

### 自动化验证

- dispatcher/handler 单元测试
- Finder 场景回归脚本
- AI CLI/API fallback 自动化测试

---

## 当前风险与应对

### 风险 1：Dispatcher 仍为单文件，继续增长会再次变重
应对：下一轮按业务域拆分 `handlers/`（copy/file/open/ai/view/git）。

### 风险 2：部分动作仍为 MVP，边界行为未覆盖
应对：先补 smoke/回归，再决定是否扩大默认暴露。

### 风险 3：Finder 真机行为与 preview 仍可能出现语义漂移
应对：把手动验证清单固定化并执行。

---

## 参考文档

- `docs/p0-hardening-plan-and-verification.md`
- `docs/action-implementation-status.md`
- `docs/implementation-tracks.md`
- `docs/manual-validation-checklist.md`
