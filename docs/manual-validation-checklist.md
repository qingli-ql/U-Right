# U-Right 手动验证清单

更新时间：2026-04-02

这份清单只覆盖当前收缩阶段必须手动确认的最小回归，不追求一次覆盖所有功能。

## 使用方式

- 默认从 `/Applications/U-Right.app` 验证
- 默认开发入口使用 `make dev`
- 菜单、设置、执行结果不一致时，先暂停新增改动，先查真相源是否漂移
- 每轮改动至少走完 Finder 四类上下文，再补改动相关专项

## 验证前准备

- [ ] 通过 `make dev` 启动当前开发主线
- [ ] 确认 Finder Sync Extension 已启用
- [ ] 确认当前权威安装路径是 `/Applications/U-Right.app`
- [ ] 准备一组验证样本：单文件、单文件夹、两个以上混合选择、可右键的空白区域
- [ ] 若验证 AI，先确认本机是否安装 Claude CLI / Codex CLI，并记录“有 CLI”还是“无 CLI”路径

## Finder 四类上下文

### 1. 文件

- [ ] 右键单文件时，菜单能正常弹出
- [ ] 只出现当前文件上下文允许的动作，没有明显错位动作
- [ ] 已接通核心动作至少抽查：
  - [ ] `copy.path`
  - [ ] `copy.relative-path`
  - [ ] `file.rename`
  - [ ] `file.duplicate`
  - [ ] `file.trash`
  - [ ] `finder.reveal`
- [ ] AI 入口若当前设置允许显示，点击后能进入 Prompt / Result 主链路

### 2. 文件夹

- [ ] 右键单文件夹时，菜单能正常弹出
- [ ] 创建类动作可见且可执行：
  - [ ] `create.new-file`
  - [ ] `create.new-folder`
  - [ ] `create.template.*`（至少抽查一个模板）
- [ ] 打开类动作至少抽查一个编辑器或终端动作可执行
- [ ] 若显示脚本或自定义打开动作，点击后能进入对应执行链路

### 3. 多选

- [ ] 多选文件或文件夹时，菜单能正常弹出
- [ ] 不适用单文件语义的动作不会错误暴露
- [ ] 已支持的多选通用动作至少抽查：
  - [ ] `copy.path`
  - [ ] `file.trash`
  - [ ] `file.compress`
- [ ] AI 相关多选入口若仍默认隐藏，则确认没有误显示

### 4. 空白区域

- [ ] 在目录空白区域右键时，菜单能正常弹出
- [ ] 创建类动作可见且落点正确在当前目录
- [ ] 不依赖选中文件的动作不会报错
- [ ] 需要选中对象的动作不会误显示

## 本轮补动作专项

以下项只在对应轨道宣告“已实现”后打勾；若未完成，应继续保持隐藏。

### Copy 系列

- [ ] `copy.filename`：对单文件返回文件名，且不带目录
- [ ] `copy.basename`：对带扩展名文件返回去扩展名名称
- [ ] `copy.extension`：对带扩展名文件返回扩展名
- [ ] 上述 3 项在不适用场景不会错误显示或产生异常

### View 系列

- [ ] `view.toggle-hidden`：执行后 Finder 隐藏文件显示状态有变化，或当前版本明确继续隐藏
- [ ] `view.refresh`：执行后 Finder 能刷新当前目录，或当前版本明确继续隐藏

## 设置关键回归

### Context Menu / Preview

- [ ] 修改菜单相关设置后，Settings Preview 立即反映变化
- [ ] 相同设置下，Finder 实际菜单与 Preview 没有明显漂移
- [ ] `showUnavailableInPreview` 行为符合预期
- [ ] `collapseSingleActionGroups` 行为符合预期

### Templates / Custom Actions / Scripts

- [ ] 新增或启用一个模板后，Finder 菜单能看到并执行
- [ ] 调整模板顺序后，菜单顺序同步变化
- [ ] 至少一个 `open.custom.*` 从设置保存到实际执行走通
- [ ] 至少一个 `script.run.*` 能执行，失败时有可见错误反馈

### 状态类设置

- [ ] 扩展状态展示能反映真实启用状态，而不是固定文案
- [ ] 工具检测能区分 CLI 已安装 / 未安装
- [ ] `Launch at Login` 若本轮有改动，需确认改后状态可读回

## AI 关键回归

### CLI 存在路径

- [ ] `ai.ask-claude` 在 CLI 可用时优先走 CLI
- [ ] `ai.ask-codex` 在 CLI 可用时优先走 CLI
- [ ] Prompt 编辑后的内容会影响实际请求
- [ ] Result 窗口能显示结果、错误或流式输出

### CLI 缺失 / fallback 路径

- [ ] 缺少 Claude CLI 时，不会静默失败
- [ ] 缺少 Codex CLI 时，不会静默失败
- [ ] 若已配置 API fallback，可继续完成请求
- [ ] 若未配置 fallback，会给出可理解的错误提示

## 回归记录建议

每次手动验证至少记录以下结果，方便主控汇总：

- [ ] 本轮验证基线：日期、分支、构建方式
- [ ] 四类 Finder 上下文是否通过
- [ ] 本轮新增动作是“已通过”、“继续隐藏”还是“有缺陷待修”
- [ ] AI 验证走的是 CLI 路径还是 fallback 路径
- [ ] 设置与 Preview 是否一致
- [ ] 是否发现只在 `/Applications/U-Right.app` 之外才能复现的问题

## 阻塞判定

出现以下任一情况，本轮不应标记为可交付：

- [ ] Finder 四类上下文中任一类无法稳定出菜单
- [ ] 已默认暴露的动作点击后无响应或执行到错误目标
- [ ] Settings Preview 与 Finder 实际菜单明显不一致
- [ ] CLI 缺失时 AI 动作直接失败且没有清晰提示
- [ ] 当前轮次宣称补齐的动作实际上仍不可用
