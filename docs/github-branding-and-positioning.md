# U-Right 品牌与 GitHub 展示建议

更新时间：2026-04-03

这份文档用于统一项目名称判断、对外一句话介绍、GitHub 仓库 About、topics 和对外表达方式。

## 先说结论

`U-Right` 作为品牌名，**有记忆点，但不够自解释**。

它的优点是：

- 短
- 好记
- 有一点 “right click / 右键” 的联想
- 看起来像一个可以长期使用的产品名，而不是一次性功能名

它的问题是：

- 第一次看到时，用户不一定知道它和 Finder / macOS / 右键菜单有关
- `U` 的含义不够明确
- 如果没有副标题，GitHub 列表页里识别成本较高

所以更适合的策略不是马上改名，而是：

**保留 `U-Right` 作为品牌名。**

同时在所有对外入口都固定搭配一句副标题：

**`U-Right: Finder-native super context menu for macOS.`**

## 名字判断

### 为什么它不差

如果一个名字太功能化，比如直接叫：

- Finder AI Menu
- macOS Right Click Tool
- Finder Context Helper

虽然一眼能懂，但品牌感弱，也不利于后续扩展。

`U-Right` 的好处是，它还有做成产品名的空间，不会随着功能扩展而显得过窄。

### 为什么它又不够强

如果用户第一次在 GitHub、社交媒体、群聊链接里看到：

`U-Right`

他不太可能立刻知道这是：

- macOS 产品
- Finder 工具
- 右键菜单工具
- 带 AI 的上下文动作系统

所以它不能裸奔，必须长期和一句解释性文案绑定。

## 推荐定位话术

### 推荐一句话版本

`U-Right is a Finder-native super context menu for macOS, bringing AI actions, templates, scripts, and tool shortcuts into the right-click flow.`

### 推荐短版本

`Finder-native super context menu for macOS.`

### 推荐中文版本

`面向 macOS Finder 的原生右键增强工具，集成 AI 动作、模板、脚本与高频工具快捷入口。`

## GitHub About 建议

当前仓库 description:

`AI modern click-right tools`

这个描述太泛，也不够自然，不建议继续使用。

推荐改成下面这条：

`A Finder-native super context menu for macOS with AI actions, templates, scripts, and tool shortcuts.`

如果你想更短一点，可以用：

`Finder-native super context menu for macOS.`

如果你想更偏产品定位，可以用：

`Bring AI actions, templates, and tool shortcuts into the macOS Finder right-click flow.`

## GitHub Topics 建议

推荐 topics：

- `macos`
- `finder`
- `finder-sync`
- `context-menu`
- `productivity`
- `electron`
- `react`
- `typescript`
- `ai`
- `developer-tools`

如果后续更强调自动化或文件工作流，也可以考虑：

- `file-management`
- `workflow`
- `automation`

## GitHub 仓库首页建议

仓库首页第一屏应该回答 3 件事：

1. 这是什么产品
2. 为什么和别的 Finder 工具不一样
3. 当前做到什么程度

README 顶部建议长期保持这个结构：

- `U-Right`
- 一句英文副标题
- 1 行中文产品解释
- 亮点徽章
- 价值主张

## 推荐对外表达模板

### GitHub 仓库标题下方

`A Finder-native super context menu for macOS with AI actions, templates, scripts, and tool shortcuts.`

### 发帖 / 发推 / 发群消息

`U-Right is a Finder-native super context menu for macOS. It brings AI actions, templates, scripts, and tool shortcuts directly into Finder right-click workflows.`

### 中文介绍

`U-Right 是一个面向 macOS Finder 的超级右键工具，把 AI 动作、模板、脚本和高频工具快捷入口带回 Finder 原生上下文。`

## 如果未来要改名，判断标准是什么

只有在下面这些情况同时成立时，才值得考虑改名：

- 外部用户普遍记不住 `U-Right`
- 很多人看不懂这是右键 / Finder 产品
- 需要明显更强的传播性

改名时建议优先满足：

- 一眼能和右键 / Finder / 文件工作流建立联系
- 能作为产品名长期存在
- 不要太像一次性 feature name

当前阶段，我的建议仍然是：

**先不改名。先把副标题、About、README 和对外话术统一。**

## 当前落地状态

- README 顶部已补充英文副标题
- GitHub About 已给出建议文案
- GitHub topics 已给出建议列表

补充说明：

我尝试通过 `gh` 直接更新 GitHub 仓库 About 和 topics，但当前 token 权限不足，返回 `403`，因此这部分暂时只能以文档建议形式保留，需在有仓库管理权限的环境里执行。
