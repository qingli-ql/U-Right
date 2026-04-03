# U-Right 收缩原则与下一步 TODO

更新时间：2026-04-02

这份文档不再讨论大而全的产品蓝图，只记录当前收缩阶段真正需要坚持的原则、已经完成的收口，以及接下来要做的事情。

## 当前设计思想

这个产品本质上只有一件事：

**在 Finder 上下文下，稳定地显示正确动作，并按用户设置正确执行。**

围绕这件事，当前只保留三条设计思想：

- `Finder Sync Extension` 保持薄，只负责采集上下文、生成菜单、转发请求
- `Shared` 负责动作定义、设置模型、可用性判断、菜单构建
- `Electron Host` 负责设置、日志、提示词、结果窗口和动作执行

不要再额外发明新的大框架。

## 第一性原则

### 1. 单一真相源

- 动作是否存在
- 动作标题、分类、排序
- 动作在当前上下文是否显示、是否可用

这些都应该来自同一份动作注册表和同一套 evaluator。

### 2. 设置必须真的影响结果

用户在 Settings 里改的内容，必须同时影响：

- Finder 菜单显示
- Settings Preview
- Electron 执行结果

如果改了设置但行为不变，这个设置就是假的。

### 3. 执行器只负责执行

执行器只做：

- `actionID -> handler`

不要再在执行器里决定“这个动作该不该存在、该不该显示、应该归哪类”。

### 4. 宁可少做，也不要假完成

- 没真正做完的动作先隐藏
- 不要靠文档和菜单名称提前承诺
- 先把高频动作做稳，再加新动作

## 现在采用的简单模式

当前以及后续都只用这几个简单角色：

- `ActionRegistry`：定义动作
- `ActionEvaluator`：判断显示 / 可用
- `ActionMenuBuilder`：根据上下文产出菜单
- `ActionHandlerMap` 或 `switch(actionID)`：执行动作

只要这四层边界稳定，系统就够用了。  
暂时不需要再引入更重的抽象。

## 已完成

### Settings 收口

- 已按 `general / integrations / contextMenu / templates / ai / customActions / advanced` 分区收口
- Electron Settings 已可编辑上述主要分区
- 原生 Settings 已开始按同一套领域语义读写

### 菜单与预览

- Finder 菜单已接到 `Swift Shared ActionRegistry`
- Electron Settings Preview 已接到真实 registry / evaluator
- `showUnavailableInPreview` 与 `collapseSingleActionGroups` 已可工作
- `Context Menu` 已升级为工作台，可直接调整分类顺序、动作顺序和动作跨组
- Settings 动作列表已能解释“当前上下文为什么不显示”

### 动作执行

- Electron 已接通核心动作执行链路
- 自定义 `open.custom.*` 已能进入统一菜单解析与执行链路
- `script.run.*` 已能进入统一菜单解析与执行链路

### AI 基础链路

- `Ask Claude About This`
- `Ask Codex About This`
- Prompt 编辑
- Result 窗口显示
- CLI 优先，API fallback

## 当前还没收干净的问题

### 1. 真相源还没有完全统一

现在仍然是：

- 菜单生成主要看 `ActionRegistry`
- 预览已经接到 evaluator
- Electron 执行端仍然是手写 `switch`
- 原生 Host 对照路径仍保留独立执行逻辑

这意味着系统已经比以前好很多，但还没彻底收束。

### 2. 动作声明仍然多于真实完成度

当前注册表里有不少 `planned` 动作。  
这些动作继续保留可以，但默认不要暴露给用户。

### 3. 设置闭环还不完整

以下能力还没完全做成“改了就生效、状态也能被验证”的闭环：

- Launch at Login
- 扩展状态展示
- 工具测试
- AI 高级动作映射

补充说明：

- `Context Menu` 基础工作台已经成型
- 但当前仍是一层层级，不是多级树形菜单编辑器

## 踩过的坑与应对策略

### 1. Finder 传来的不是本地路径，而是 `file://...`

坑：

- 直接把 Finder 上下文路径当本地路径使用，会导致复制、打开、创建等动作出错

策略：

- 所有执行器入口先统一做 URL -> 本地路径归一化
- 后续新增动作必须复用同一层归一化逻辑

### 2. 多份同 bundle id 产物会干扰排障

坑：

- Finder / `pluginkit` / `/Applications` / `build` 目录里同时存在多份产物时，很难知道系统实际加载哪一份

策略：

- 日常只认 `/Applications/U-Right.app`
- 开发统一走 `make dev`

### 3. Electron 多进程残留会导致“看起来更新了，实际没更新”

坑：

- 旧的 `vite` / `wait-on` / `electron` 进程残留会让窗口连到旧入口

策略：

- 统一使用 `make dev`
- 清理逻辑集中在 `scripts/dev_electron.sh`

### 4. 菜单、预览、执行各写一套规则会持续漂移

坑：

- 一处改了，另一处没改，最后用户看到的和实际执行的不一致

策略：

- 菜单与预览继续统一依赖同一份 registry / evaluator
- 执行端逐步收敛到清晰的 handler 映射，不再散落条件逻辑

## 下一步 TODO

只列当前真正该做的，不列远期幻想。

### P0：先把真相统一和高频动作补齐

- [x] 明确一份“当前默认暴露动作”清单，未完成动作继续隐藏
- [x] 把 `copy.filename / copy.basename / copy.extension` 做完
- [x] 把 `view.toggle-hidden` 和 `view.refresh` 做到可用或继续隐藏
- [x] 统一 Electron 执行端的路径归一化入口，避免新动作重复踩坑
- [x] 检查 Settings 修改后，菜单预览与实际菜单是否一致
- [x] 让 Settings 能解释“为什么当前上下文不显示这个动作”

### P1：把用户配置闭环做实

- [ ] 把默认 terminal / editor / custom open action 的执行闭环做扎实
- [ ] 把模板创建、启用、排序、菜单反映这条链路做扎实
- [ ] 把脚本发现、脚本报错提示做清楚
- [ ] 把 Launch at Login、扩展状态展示补成可验证状态，而不是纯开关
- [x] 把 `Context Menu` 升级为可操作工作台
- [ ] 把 `Context Menu` 从一层工作台升级到真正的多级子菜单编辑器

### P2：只做少量高价值 AI 动作

- [ ] 保留并做深 `Ask Claude / Ask Codex`
- [ ] 从高级 AI 动作里只挑 3~5 个高价值动作继续做
- [ ] 没独立逻辑的 AI 动作继续隐藏，不要提前暴露
- [ ] 改善 Result 窗口里的错误提示和长输出体验

### P3：发布前必须补的东西

- [ ] 最小化回归清单：文件 / 文件夹 / 多选 / 空白区域
- [ ] 最小化测试：动作可用性、路径归一化、关键 handler smoke test
- [ ] Developer ID / notarization / staple 流程

## 暂时不做

- 不做新的大而全设置框架
- 不做复杂脚本 DSL
- 不做模板平台化设计
- 不做大规模 AI action 铺设
- 不做纯概念性的“第二系统”

现在是收缩阶段。  
目标不是“看起来更完整”，而是“已经做出来的东西真的稳”。
