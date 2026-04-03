# U-Right 右键菜单当前设计

更新时间：2026-04-02

这份文档只描述当前菜单链路怎么工作、已经做到了什么、还有什么没做完。

## 当前链路

1. `Finder Sync Extension` 采集当前 Finder 上下文
2. `Shared ActionRegistry` 根据上下文和设置生成菜单
3. 扩展把点击动作写入请求目录
4. Electron 监听请求目录并执行对应动作

## 当前设计原则

- 扩展只负责上下文和菜单，不做复杂业务
- 菜单显示规则来自 `Shared`
- Electron 负责执行、Prompt、Result、日志
- 没做完的动作默认隐藏

## 已完成

### 菜单生成

- 已支持文件 / 文件夹 / 多选 / 空白区域语义
- 已支持分类、排序、显隐和预览相关设置
- 已支持运行时模板动作
- 已支持运行时自定义 `open.custom.*`
- 已支持运行时 `script.run.*`
- 已支持 Context Menu 工作台中的分类排序、动作排序、动作跨组移动
- 已支持分组布局切换：`inline / submenu`

### Electron 已接通的核心动作

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

### Settings 工作台现状

- `Context Menu` 已不再只是按分类列一个动作清单
- 当前工作台已能直接操作：
  - 分类拖拽排序
  - 动作拖拽排序
  - 动作跨组移动
  - 单动作启用 / 禁用
  - 单分组启用 / 禁用
  - 单动作 / 单分组重置默认
  - `collapseSingleActionGroups`
  - `showUnavailableInPreview`
- 当前 `Items` 列表会明确解释：
  - 当前预览上下文会不会出现
  - 如果不会出现，原因是什么

### 视图动作现状

- `view.refresh` 已接入 Electron 主线执行器
- `view.toggle-hidden` 已接入 Electron 主线执行器
- 两者都复用了执行入口的路径归一化逻辑
- 成功会给出结果提示，失败会显示明确错误
- 当前已进入 `beta`，是否继续默认暴露以手动验证结果为准

## 当前未完成

- `folder.search`
- `folder.size`
- `folder.count`
- `multi.batch-rename`
- 大部分高级 AI 动作

## 已踩坑

### 1. Finder 上下文路径不是本地路径

- Finder 写进请求里的经常是 `file://...`
- 执行前必须统一转成真实本地路径
- 视图动作还要额外区分“选中文件的父目录”和“选中文件夹自身”

### 2. 菜单声明和执行实现容易漂移

- 菜单来自 registry
- 执行来自 Electron handler
- Settings 工作台也依赖同一套 evaluator
- 新增动作时必须同时检查“声明、工作台、预览、执行”四处

### 3. 不要过早暴露动作

- 只要 Electron 主线没实现，就不要默认显示

## 当前应对策略

- 新动作先进入 registry，没做完继续隐藏
- Electron 执行器里只补实际要上线的动作
- beta 动作先按最小回归清单验证，再决定是否进一步扩大暴露
- Settings 工作台优先解释“为什么当前不会出现”，而不是假装所有动作当前都应该可见
- 菜单相关改动后，最少验证四种上下文：
  - 文件
  - 文件夹
  - 多选
  - 空白区域

## 当前限制

- 当前可编辑的是**一层工作台结构**：
  - 分类层
  - 动作层
- 还不支持任意多级树形 submenu 编辑
- 如果后续要支持真正的子菜单树，需要扩展 settings schema 与 menu builder

## 怎么用

- 日常开发入口：`make dev`
- 查看当前动作状态：`docs/action-implementation-status.md`
- 排障优先看：`docs/finder-sync-debugging.md`
