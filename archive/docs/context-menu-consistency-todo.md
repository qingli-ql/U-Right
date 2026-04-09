# Context Menu Consistency TODO

## 目标

- `Settings > Context Menu` 只展示真实 Finder 数据，不再展示 fallback 推测结果。
- 只要真实数据缺失、容器冲突、版本未归一化，就直接报错。
- Finder、Electron、Shared 对同一份 settings、同一份 snapshot、同一份 app group 得出同一结论。

## 当前已确认问题

- Electron 与 Finder 存在多个候选共享容器：
  - `RVW672S662.uright.shared`
  - `group.com.openai.uright`
- Electron 当前共享根目录里没有 `finder-menu-snapshot.json`。
- `Settings` 在没有真实 snapshot 时仍会继续跑动作分析，导致页面看起来像“Actual Menu”，实际上不是。
- `create.new-file` 在设置定义层已放开到 `file / folder / empty`，但 Finder 实际右键尚未验证为同一规则。
- `settings.json` 当前仍可能是旧版本文档，存在 v1/v2 归一化不一致风险。

## 为什么会这样

- 早期原型使用过 `group.com.openai.uright` 作为 fallback app group。
- 后续签名 / team id 接入后，运行时实际 app group 变成了 `RVW672S662.uright.shared`。
- 旧容器不会自动消失，于是系统中同时残留了新旧两份共享目录。
- Electron 之前对“候选容器”的判断过于宽松，把历史残留容器也当成当前冲突来源。
- Finder 的真实菜单快照只会在 Finder 右键时写入，所以如果刚装好扩展但还没触发一次真实菜单，snapshot 会缺失。

## 坑点

- 不要把 fallback app group 当成长期真相源。
- 不要把“磁盘上存在旧容器”直接等价成“当前运行冲突”。
- 不要在没有 Finder snapshot 时继续渲染所谓 `Actual Menu`。
- 不要假设 Electron 的 settings 更新就等于 Finder Extension 已经吃到最新逻辑。
- Finder Sync 改动如果不重新安装 / reload extension，系统很可能继续跑旧版本。

## 解决策略

- app group 统一策略：
  - 运行时只认安装包/环境显式注入的 app group
  - 旧 `group.com.openai.uright` 仅作为一次性迁移来源，不再作为长期 fallback 容器
- 容器迁移策略：
  - 启动时把旧容器 settings 自动迁移到当前容器
  - 提供清理脚本删除历史遗留容器
- 数据一致性策略：
  - `settings.json` 自动升级到当前版本并回写
  - 无 snapshot 直接 error
  - snapshot 是 `Actual Menu` 唯一来源
- 开发流程策略：
  - Finder 菜单相关改动后必须执行安装 + reload extension
  - 右键一次 Finder 后再看 Settings
  - 日志必须包含 snapshot 落盘成功/失败记录

## 一致性原则

- 单一真相源：
  - app group 只能有一个最终来源。
  - settings 只能读一份归一化后的文档。
  - actual menu 只能来自 Finder Extension 写出的 snapshot。
- 无真实数据则报错：
  - 缺少 snapshot
  - 多容器冲突
  - settings 版本过旧
  - snapshot app group 与 Electron app group 不一致
- 不允许 fallback 数据继续参与“Actual Menu”展示。

## TODO

1. 收束 app group 真相源

- 清理 Electron 默认 `group.com.openai.uright` 与运行时 `RVW672S662.uright.shared` 的分叉。
- 明确唯一来源：
  - 优先使用打包/运行时 Info.plist 注入值
  - Electron dev 也必须显式注入同一值
- 删除所有“猜一个可用容器”的兜底逻辑，改为：
  - 解析不到唯一 app group 时直接 error

2. 强制 Finder snapshot 成为实际菜单唯一来源

- Finder Extension 每次构建菜单必须写入：
  - `finder-menu-snapshot.json`
  - 上下文
  - 最终菜单树
  - availability
  - snapshot 写入路径日志
- Electron 只读取该 snapshot，不再自行推导 actual menu。
- snapshot 缺失或损坏时直接 error。

3. 严格模式 UI

- Context Menu 页面出现以下任一情况时整页 error：
  - 没有 snapshot
  - 多个候选容器
  - settings 版本小于当前规范版本
  - snapshot / Electron app group 不一致
- error 页面只展示：
  - 错误列表
  - 原始诊断字段
  - 当前 shared root / settings file / settings version / snapshot presence
- 不再展示：
  - Configured vs Actual diff
  - action availability 分析
  - fallback context

4. 校准 Finder 与 Electron 的 action registry

- 重点验证：
  - `create.new-file`
  - `create.new-folder`
  - `submenu.templates`
  - `git.status`
  - `view.refresh`
  - `view.toggle-hidden`
- 以 Finder snapshot availability 为准，不以 Settings 侧 evaluator 为准。
- 只有当 Finder snapshot 已证明规则生效后，Settings 才恢复对应展示。

5. 统一 settings 版本归一化

- Electron load/save 必须把文档归一化到当前版本并回写。
- Finder / Swift load/save 必须使用同一版本号和同一迁移逻辑。
- 只要读到旧版本文档，diagnostics 直接 error，不再继续展示“看起来可用”的菜单状态。

6. 增加排障日志

- Finder Extension：
  - app group
  - shared root
  - settings path
  - snapshot path
  - snapshot write success/failure
- Electron Host：
  - app group
  - shared root
  - settings path
  - snapshot path
  - diagnostics error list

## 验收标准

- Finder 右键一次后，Electron 当前 shared root 中一定能看到 `finder-menu-snapshot.json`。
- Context Menu 页面若无 snapshot，不显示任何“Actual Menu”分析，只显示 error。
- `create.new-file` 在 file/folder/empty 的真实 Finder snapshot 中与设计规则一致。
- `Configured Actions vs Actual Menu` 只在无 error 时出现。
- Finder、Electron、Settings 三者对同一动作的结论一致。
