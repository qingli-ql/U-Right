# U-Right Subagent Dispatch Board

更新时间：2026-04-05

关联 PRD：

- [architecture-reset-prd.md](/Users/qingli/Projects/agent_servers/claude-uright/specs/2026-04-05-architecture-reset-prd.md)

目的：

- 让 phase 调度可执行、可审计、可重复
- 防止多个 subagent 在边界未冻结前并发改同一类真相源
- 每个 subagent 必须读取同一份 PRD，并提交“实现方案 + 验证方案 + 未验证风险”

---

## 调度总原则

1. Phase 1-4 是真相源收口阶段，先做边界冻结和文件级落地方案，不允许各自随意开写。
2. 每个 subagent 的输入必须包含：
   - PRD 路径
   - 只聚焦的 phase
   - 具体产出要求
   - 不接受中间态和假定成功
3. 每个 subagent 的输出必须包含：
   - 必改文件列表
   - 必删逻辑列表
   - 验证步骤
   - 未验证风险
4. 未给出验证路径的输出，不进入实施。
5. Phase 5-7 不得提前编码，直到 Phase 1-4 的 contract 明确冻结。

---

## 串行边界

### 必须串行冻结的 contract

1. 宿主真相
2. action manifest schema
3. settings schema v3
4. request queue contract

### 冻结前禁止

- 禁止重写 Renderer settings state
- 禁止重写 Electron Main action dispatcher
- 禁止开始批量删除旧代码
- 禁止新加兼容层

---

## 已派发 Subagent

## Phase 1：宿主真相收口

- subagent：`Boole`
- 输入：
  - PRD
  - 构建/安装/唤醒相关脚本与代码
- 产出要求：
  - 宿主真相收口的文件级实施方案
  - 必删路径清单
  - Finder 唤醒与 Electron bundle 的可重复验证清单
- 验证门槛：
  - 不能只说“把 Native Host 去掉”
  - 必须说清 build / install / wake / logs 分别怎么确认

## Phase 2：action manifest 单源化

- subagent：`Linnaeus`
- 输入：
  - PRD
  - TS/Swift action registry
  - 生成脚本
  - parity check
- 产出要求：
  - manifest schema
  - 生成链路
  - 替换手写定义的文件级方案
  - 漂移项暴露清单
- 验证门槛：
  - 必须覆盖字段级一致性
  - 不接受只校验 action id

## Phase 3：settings schema v3

- subagent：`Mencius`
- 输入：
  - PRD
  - Swift/TS settings/store/normalize 代码
- 产出要求：
  - v3 schema
  - migration 设计
  - 必删字段
  - repository 落点
  - 可重复验证
- 验证门槛：
  - 不允许继续保留 flat+nested 双轨
  - 必须明确老数据迁移方式

## Phase 4：request queue 可靠化

- 状态：待单独确认输出
- 输入要求：
  - PRD
  - Finder handoff
  - SharedPaths
  - Electron request watcher
  - diagnostics/logging
- 产出要求：
  - queue 目录结构
  - incoming/processing/done/failed 语义
  - 必删旧 watcher/handoff 逻辑
  - crash/restart 验证设计
- 验证门槛：
  - 不接受 `fs.watch + delay` 作为唯一语义
  - 必须说明 request 不丢失如何证明

---

## Phase 1-4 输出验收模板

每个 subagent 返回时必须按这个结构：

1. 目标
2. 当前阻塞点
3. 必改文件
4. 必删逻辑
5. 实施顺序
6. 自动化验证
7. 手工验证
8. 未验证风险

---

## 后续并行条件

只有当以下四项都冻结，才允许并行推进：

- Host contract 冻结
- Action manifest schema 冻结
- Settings schema v3 冻结
- Queue contract 冻结

冻结后可并行：

- Phase 5 Electron Main 分层
- Phase 6 Renderer 分窗口拆分
- Phase 7 自动化测试与文档闭环

---

## Coordinator 责任

主协调者必须做的事：

1. 汇总各 subagent 输出
2. 识别相互依赖
3. 防止 contract 未冻结前并发写入
4. 拒绝没有验证方案的提交
5. 拒绝“看起来对”但没证据的结论

---

## 当前结论

当前阶段的正确做法不是立即让多个 subagent 同时改代码，而是：

1. 先让 Phase 1-4 subagent 交出文件级实施与验证方案
2. 主协调者收敛真实串行边界
3. 只在 contract 冻结后才放开 Phase 5-7 并行编码

否则开发效率不会提高，只会更快地产生新一轮架构漂移。
