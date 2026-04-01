# U-Right 右键菜单 MVP 实施说明

更新时间：2026-04-01

## 本轮目标

本轮把 Finder 右键菜单从“声明很多、实现很散”收敛为一个可配置、可维护、可验证的 MVP：

- Finder 菜单只展示已实现且当前可用的动作
- 菜单分类、排序、显隐由设置页控制
- Finder Extension 只负责上下文和菜单渲染
- Host App 通过 handler registry 执行动作
- Shared 层统一维护动作定义、依赖和菜单构建规则

## 已落地的模块边界

### Shared

- `ActionCatalog`
  - 统一注册动作定义
  - 标记实现状态、默认分类、默认顺序、依赖要求
- `ActionAvailabilityEvaluator`
  - 统一判断动作是否显示、是否启用、禁用原因
- `ActionMenuBuilder`
  - 根据上下文和设置生成最终 Finder 菜单
- `ContextMenuSettings`
  - 保存分类配置、动作配置、预览开关

### Host

- `ActionExecutionService`
  - 统一动作执行入口
- `ActionHandlerRegistry`
  - 根据 action id 分发 handler
- handler 拆分：
  - `CreateActionHandler`
  - `OpenToolActionHandler`
  - `ClipboardActionHandler`
  - `FileOperationActionHandler`
  - `GitActionHandler`
  - `AIActionHandler`
  - `ScriptActionHandler`
- `HostActionDispatcher`
  - 只负责拿请求、读设置、调用执行服务

### Finder Extension

- `FinderSyncExtension`
  - 读取上下文
  - 读取设置
  - 调用 `ActionRegistry.topLevelActions`
  - 按菜单描述渲染 `NSMenu`
  - 将点击动作转发给 Host

## 当前保留在菜单里的核心动作

### P0

- `New File`
- `New Folder`
- `Open in Terminal`
- `Open in VS Code`
- `Open in Cursor`
- `Open in Zed`
- `Copy Path`
- `Reveal in Finder`
- `Rename`
- `Move to Trash`
- `Ask Claude About This`
- `Ask Codex About This`

### P1（已保留为 beta）

- `Duplicate`
- `Compress`
- `Copy Relative Path`
- `Open Git Status Here`
- `JSON Format`
- `Toggle Executable Bit`
- `Scripts`

### 已隐藏

- 所有 `planned` AI 高级动作
- `Show Hidden Files Here`
- `Refresh Finder Window`
- `Search in Folder`
- `Folder Size`
- `Count Items`
- `Batch Rename`

## 设置页能力

本轮新增：

- `Context Menu` 标签页
  - 分类启用/禁用
  - 分类顺序调整
  - 分类显示方式：`inline` / `submenu`
  - 动作启用/禁用
  - 动作分类迁移
  - 动作顺序调整
  - 四种上下文预览：`File` / `Folder` / `Multi` / `Empty`

- `Tools` 标签页
  - 工具检测状态
  - 自定义路径
  - 是否允许依赖该工具的菜单动作出现
  - 单工具测试

## 角色分工

### 角色 A：Shared / Schema

负责：

- 新动作继续进入 `ActionCatalog`
- 菜单可见性规则统一写在 `ActionAvailabilityEvaluator`
- 新分类或排序规则统一写在 `ContextMenuSettings`

交付标准：

- 不允许绕过 catalog 直接在 Finder Extension 里硬编码菜单

### 角色 B：Host 执行

负责：

- 新功能优先通过新增 handler 或扩展现有 handler 实现
- 所有写操作和危险操作走统一确认
- 错误提示和日志统一

交付标准：

- 不允许把业务逻辑重新塞回 `HostActionDispatcher`

### 角色 C：Settings / UX

负责：

- 持续完善 `Context Menu` 和 `Tools` 页
- 让预览结果和 Finder 实际菜单保持一致
- 设置必须由 Host 和 Extension 共享读取

交付标准：

- 不允许只做 UI 假数据，必须影响真实菜单输出

### 角色 D：验证 / 集成

负责：

- 按四种上下文回归菜单
- 核对工具依赖显隐
- 验证 Host 与 Extension 设置一致性
- 验证 AI CLI / API fallback

交付标准：

- 所有新动作进入菜单前必须通过验证清单

## 验证清单

## 签名与运行说明

由于 Finder Extension 现在通过 `App Group` 与 Host 共享请求和设置，扩展不能再依赖 ad-hoc / `Sign to Run Locally` 路径。

推荐命令行构建：

```bash
DEVELOPMENT_TEAM=YOUR_TEAM_ID make build CONFIG=Debug
DEVELOPMENT_TEAM=YOUR_TEAM_ID make install CONFIG=Debug
```

如需让 `xcodebuild` 自动处理本地 provisioning 更新，可额外加：

```bash
ALLOW_PROVISIONING_UPDATES=1 DEVELOPMENT_TEAM=YOUR_TEAM_ID make build CONFIG=Debug
```

如果未设置 `DEVELOPMENT_TEAM`，脚本会执行无签名构建，仅用于编译验证；此时 Finder Extension 不会被系统加载。

### Finder 菜单

必须验证：

- 单文件
- 单目录
- 多选
- 空白区域

检查项：

- 分类顺序正确
- 已隐藏动作不出现
- 工具缺失动作不出现
- 禁用动作在预览中可见、在 Finder 菜单中不出现或禁用

### 动作执行

至少验证：

- 成功执行
- 用户取消
- 失败提示

### 设置

至少验证：

- 调整分类顺序后菜单顺序变化
- 禁用动作后菜单不再显示
- 切换分类显示方式后菜单结构变化
- 重启 App 后设置仍保留

### AI

至少验证：

- Claude CLI 可用
- Codex CLI 可用
- CLI 不可用但 API 可用
- CLI 和 API 都不可用

## 后续建议顺序

1. 把 P1 动作逐个从 beta 打磨成 implemented
2. 为 `Context Menu` 页补更精细的动作详情和筛选
3. 把 `Open With`、`Batch Rename`、`Folder Size` 等动作重新设计后再恢复
4. 引入更系统的人工 QA 清单或逻辑层测试
