# Claude Code 项目配置指南

这份文档不是在讲“Claude 是什么”，而是在讲：对于你这个 macOS Finder 超级右键工具项目，应该怎样配置 Claude Code，哪些文件该放哪里，哪些能力最值得先用，什么时候该上 subagents、skills、agent teams，哪些先别上。

目标读者是“项目整体开发经验还不多，但希望用 Claude Code 稳定推进项目”的你。

---

## 1. 先记住这 6 个最关键的结论

1. `CLAUDE.md` 负责“长期有效的项目规则”，不要把它写成百科全书。
2. `skills` 负责“按需加载的专业知识和流程模板”，适合沉淀 Finder Sync、签名发布、AI 上下文构造这类重复知识。
3. `subagents` 负责“拆角色干活”，适合把架构、UI、AI 集成、测试审查拆开。
4. `settings.json` 负责“权限、模型、hooks、显示方式”等运行配置；用户级和项目级要分开。
5. 对多文件、大改动、你自己不确定的任务，先用 Plan Mode，再进入编码。
6. 对这个项目来说，最重要的不是“让 Claude 会写 Swift”，而是“让 Claude 清楚构建命令、测试方法、模块边界、危险操作边界”。

这些判断和官方机制是一致的：Claude Code 把 `CLAUDE.md` 当作会话启动时加载的持久指令，把 `skills` 当成低成本按需加载的知识，把 `subagents` 当成隔离上下文的专职助手，把 `hooks` 当成确定性自动化，把权限规则放在 `settings.json` 里统一控制。[memory](https://code.claude.com/docs/zh-CN/memory) [features-overview](https://code.claude.com/docs/zh-CN/features-overview) [settings](https://code.claude.com/docs/zh-CN/settings) [sub-agents](https://code.claude.com/docs/zh-CN/sub-agents)

---

## 2. 这个项目最推荐的 Claude 配置分层

先不要把所有东西都塞进一个文件。Claude Code 官方就是按作用域分层设计的：

- 用户级：适合你的个人偏好、API key、通知、默认模型
- 项目级：适合团队共享的规则、权限、skills、subagents
- 本地项目级：适合你当前机器的个人覆盖，不提交到 git

官方的主要路径是：

- `~/.claude/settings.json`
- `~/.claude/CLAUDE.md`
- `./CLAUDE.md` 或 `./.claude/CLAUDE.md`
- `./.claude/settings.json`
- `./.claude/settings.local.json`
- `./.claude/agents/`
- `./.claude/skills/`

这几个路径、优先级和适用范围都在官方设置与 memory 文档里写得很清楚。[settings](https://code.claude.com/docs/zh-CN/settings) [memory](https://code.claude.com/docs/zh-CN/memory)

---

## 3. 我建议你在这个项目里建立的文件结构

```text
claude-uright/
├── CLAUDE.md
├── .claude/
│   ├── settings.json
│   ├── settings.local.json        # 本地覆盖，gitignore
│   ├── agents/
│   │   ├── architect-planner.md
│   │   ├── finder-sync-engineer.md
│   │   ├── host-app-engineer.md
│   │   ├── shared-core-engineer.md
│   │   ├── ai-integration-engineer.md
│   │   └── qa-release-reviewer.md
│   ├── skills/
│   │   ├── finder-sync-playbook/
│   │   │   └── SKILL.md
│   │   ├── action-registry-patterns/
│   │   │   └── SKILL.md
│   │   ├── ai-context-packaging/
│   │   │   └── SKILL.md
│   │   ├── app-signing-and-release/
│   │   │   └── SKILL.md
│   │   └── manual-qa-checklist/
│   │       └── SKILL.md
│   └── hooks/
│       ├── notify.sh
│       └── protect-secrets.sh
└── docs/
    └── claude-code-project-setup-guide.md
```

这个结构里最重要的是 3 件事：

- `CLAUDE.md` 讲项目规则
- `.claude/skills/` 讲可复用知识
- `.claude/agents/` 讲角色分工

另外，记得把这些本地文件加入 `.gitignore`：

- `.claude/settings.local.json`
- `.claude/hooks/*.local.*`
- 任何只在你机器上存在的签名、证书、临时日志和调试输出目录

---

## 4. 每个文件到底该怎么配

### 4.1 `~/.claude/settings.json`

这是你的“全局个人设置”。适合放：

- 默认模型
- 通知 hooks
- 个人常用的 `teammateMode`
- 个人 API / 环境变量
- 你所有项目都适用的安全偏好

这个文件不应该放项目特有的构建命令，也不应该放团队共享规则。

一个适合你的起步版示例：

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "claude-sonnet-4-6",
  "teammateMode": "in-process",
  "cleanupPeriodDays": 30,
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

为什么这样配：

- `sonnet` 足够应付大多数编码任务；复杂架构讨论再切 `opus`
- `in-process` 对新手更稳定，先不要上 `tmux`
- 通知 hook 很实用，尤其是长时间构建、测试、签名、排查扩展启用问题时

官方文档也明确说明了 `model`、`teammateMode`、`hooks`、`cleanupPeriodDays` 等都属于 `settings.json` 的职责。[settings](https://code.claude.com/docs/zh-CN/settings) [agent-teams](https://code.claude.com/docs/zh-CN/agent-teams) [hooks](https://code.claude.com/docs/zh-CN/hooks)

### 4.2 `~/.claude/CLAUDE.md`

这是你的“全局个人偏好说明书”。适合放：

- 你喜欢的沟通风格
- 你更偏好的编码方式
- 你一贯使用的工具习惯
- 你希望 Claude 默认怎么和你协作

适合写这种内容：

```md
# My Preferences

- Explain architectural tradeoffs before large refactors.
- For multi-file tasks, prefer planning first.
- Prefer concise Chinese explanations unless I ask for depth.
- Before destructive operations, pause and confirm.
```

不要把项目结构、模块约束、Finder Sync 细节放这里，因为那不是“所有项目通用”的东西。

### 4.3 `CLAUDE.md`

这是项目里最重要的 Claude 文件。

它应该放团队共享、长期有效、Claude 无法仅靠读代码稳定推断出来的内容。官方明确建议把构建命令、测试命令、项目架构、编码标准、命名约定、工作流放到项目 `CLAUDE.md` 中，而且保持具体、简洁、结构化，最好控制在 200 行上下。[memory](https://code.claude.com/docs/zh-CN/memory) [best-practices](https://code.claude.com/docs/zh-CN/best-practices)

对于你的项目，我建议 `CLAUDE.md` 主要分成这些段落：

- 项目目标
- 模块边界
- 构建与运行命令
- 测试与验收命令
- 权限/签名/扩展启用注意事项
- 修改规则
- UI 风格约束
- AI 功能约束

一个建议模板：

```md
# Project Overview

- This project builds a macOS Finder super context-menu tool.
- Main modules: Host App, Finder Sync Extension, Shared Core.
- Priority is working integration over feature count.

# Build And Run

- Use the documented build command first before introducing new tooling.
- After changes affecting Finder Sync, verify extension discovery and menu visibility.
- After settings changes, verify persistence from both Host App and Extension sides.

# Architecture Rules

- Host App owns windows, settings, logging, AI execution, and complex workflows.
- Finder Sync Extension only collects context, builds menus, and delegates complex actions.
- Shared Core contains models, action definitions, configuration schemas, detection utilities, and prompt/context builders.

# Editing Rules

- Avoid giant manager objects.
- Prefer typed models over loose dictionaries.
- New actions must be registered through the action registry, not ad hoc conditionals.

# Verification

- For menu changes, verify file, folder, multi-selection, and empty-directory contexts.
- For AI changes, verify both CLI-present and CLI-missing paths.
- For file-writing features, require confirmation and test overwrite behavior.
```

注意：`CLAUDE.md` 不是产品需求文档，也不是技术白皮书。它更像“Claude 在这个项目里长期遵守的操作说明”。

### 4.4 `.claude/settings.json`

这是项目级运行配置，应该提交到仓库。

最适合放：

- 项目共享的权限规则
- 项目共享 hooks
- 团队共享的安全边界
- 适合全员一致的显示/模型策略

这个项目最重要的是把“Claude 能随便读什么、写什么、运行什么命令”界定清楚。

建议的起步版：

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(pwd)",
      "Bash(ls *)",
      "Bash(rg *)",
      "Bash(find *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(swift build *)",
      "Bash(swift test *)"
    ],
    "ask": [
      "Bash(xcodebuild *)",
      "Bash(codesign *)",
      "Bash(productbuild *)",
      "Bash(open *)",
      "Bash(killall Finder)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./Certificates/**)",
      "Read(./*.p12)",
      "Read(./*.mobileprovision)"
    ],
    "defaultMode": "acceptEdits"
  }
}
```

为什么这个文件非常重要：

- Finder 扩展和签名发布涉及很多系统级动作，不能一上来就开“无脑放行”
- 你这个项目很可能会出现证书、描述文件、API key、模板目录等敏感数据
- 先把 `swift build`、`swift test`、`git diff` 这类常见命令允许掉，可以减少无意义中断

官方设置文档明确支持 `allow / ask / deny / defaultMode`，也专门建议用 `permissions.deny` 排除 `.env`、`secrets` 等敏感文件。[settings](https://code.claude.com/docs/zh-CN/settings) [best-practices](https://code.claude.com/docs/zh-CN/best-practices)

### 4.5 `.claude/settings.local.json`

这是“当前机器专用覆盖”，不提交 git。

适合放：

- 你机器上的额外目录访问
- 你自己临时放宽的权限
- 你本机特有的签名/打包测试命令
- 试验中的 hooks

例如：

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "additionalDirectories": [
      "../claude-uright-scratch"
    ],
    "ask": [
      "Bash(spctl *)"
    ]
  }
}
```

这个文件对应官方说的 Local 作用域，最适合“只对你当前机器有意义”的配置。[settings](https://code.claude.com/docs/zh-CN/settings)

### 4.6 `.claude/agents/*.md`

这是项目的“角色卡”。

官方建议把项目特定的 subagents 放到 `.claude/agents/` 里，并用清晰的 `description` 触发自动委托，还要尽量限制工具权限。[sub-agents](https://code.claude.com/docs/zh-CN/sub-agents) [common-workflows](https://code.claude.com/docs/zh-CN/common-workflows)

对于你的项目，我建议至少准备这 6 个角色：

- `architect-planner`
  - 负责架构拆分、阶段计划、模块边界、风险识别
  - 工具尽量只读

- `finder-sync-engineer`
  - 负责 Finder Sync Extension 生命周期、上下文采集、菜单生成、Host 通信
  - 可读写

- `host-app-engineer`
  - 负责菜单栏 App、Settings、结果窗口、日志窗口、模板面板
  - 可读写

- `ai-integration-engineer`
  - 负责 Claude/Codex CLI 探测、上下文采样、Prompt 面板、流式结果处理
  - 可读写，允许 Bash

- `qa-release-reviewer`
  - 负责测试矩阵、风险清单、签名/打包检查、发布前 review
  - 优先只读，必要时允许 Bash

一个只读规划角色的示例：

```md
---
name: architect-planner
description: Use proactively for architecture planning, module boundaries, phased delivery, and risk analysis for this macOS Finder tool.
tools: Read, Grep, Glob, Bash
model: sonnet
permissionMode: plan
---

You are the architecture planner for this project.

Focus on:
- module boundaries between Host App, Finder Sync Extension, and Shared Core
- rollout sequence and risk control
- testability and release readiness

Avoid implementation unless explicitly requested.
```

### 4.7 `.claude/skills/<skill-name>/SKILL.md`

这是项目知识库，不是角色卡。

官方把 skill 定义成“按需加载的知识、工作流和参考材料”，建议放到 `.claude/skills/` 里；它可以带脚本、模板、示例。对于大而复杂的项目，skill 比把所有知识都堆进 `CLAUDE.md` 更合适。[skills](https://code.claude.com/docs/zh-CN/skills) [best-practices](https://code.claude.com/docs/zh-CN/best-practices)

这个项目我建议先做 5 个 skill：

- `finder-sync-playbook`
  - 记录 Finder Sync 的限制、菜单可见性规则、上下文类型、常见坑

- `action-registry-patterns`
  - 记录 Action Registry 的设计规则、菜单分组规范、上下文判定方式

- `ai-context-packaging`
  - 记录文件/文件夹/多选三类 AI 上下文如何裁剪、大小限制、摘要策略

- `app-signing-and-release`
  - 记录签名、嵌入扩展、Release 检查、启用 Finder 扩展引导

- `manual-qa-checklist`
  - 记录每次功能完成后怎么手工验证：文件、文件夹、多选、空白目录、CLI 缺失、权限不足等

一个 skill 的建议骨架：

```md
---
name: finder-sync-playbook
description: Finder Sync extension rules, menu-context behavior, and integration pitfalls for this project.
---

# When To Use

- Use when changing Finder Sync menus, context detection, or extension-host communication.

# Key Constraints

- The extension should stay thin.
- Complex UI and AI flows must be delegated to the Host App.
- Always verify file, folder, multi-selection, and empty-directory cases.

# Checklist

- Confirm extension is enabled
- Confirm menu appears in Finder
- Confirm context classification is correct
- Confirm host handoff works for complex actions
```

如果某个 skill 很少自动触发、但你又想保留它，可以考虑给它设置 `disable-model-invocation: true`，这样它不会在每次会话启动时增加上下文负担。这是官方明确支持的能力。[features-overview](https://code.claude.com/docs/zh-CN/features-overview)

### 4.8 `.claude/hooks/*`

Hooks 不是“建议”，而是“自动执行的确定性动作”。

对这个项目，我建议只先用两类：

- `Notification`
  - 构建、测试、签名、长时间排查完成时提醒你

- 保护类 hook
  - 防止误读或误操作敏感文件
  - 防止误跑破坏性命令

官方文档里明确建议把 hooks 配在 `settings.json` 中，并说明了 `PreToolUse`、`PostToolUse`、`Notification`、`TaskCompleted`、`TeammateIdle` 等事件适合做什么。[hooks](https://code.claude.com/docs/zh-CN/hooks) [best-practices](https://code.claude.com/docs/zh-CN/best-practices) [agent-teams](https://code.claude.com/docs/zh-CN/agent-teams)

对你来说，先别做太复杂的自动测试 hook。原因很简单：项目还在早期，自动化规则过重，反而会让 Claude 每步都被绊住。

---

## 5. 这个项目里，Claude 最需要哪些功能

不是所有 Claude Code 功能你都要立刻用。对你这个项目，优先级应该是这样：

### 第一优先级：一定要先会

- `CLAUDE.md`
- 项目级 `settings.json`
- Plan Mode
- `@文件` 引用
- `swift build` / `swift test` 验证
- `/clear`、`/resume`

原因：

- 这是把 Claude 用“稳”的基础
- 这决定了 Claude 改文件前是否理解边界
- 这决定了它改完后能不能自证结果

### 第二优先级：项目进入多模块开发后上

- 项目级 `skills`
- 项目级 `subagents`
- worktrees
- 通知 hooks

原因：

- 这时你开始有 Host App、Extension、Shared Core、AI 集成四条线并行
- 不拆角色，主对话很容易被上下文污染

### 第三优先级：项目中后期再上

- agent teams
- TaskCompleted / TeammateIdle hooks
- 更复杂的发布自动化
- MCP

原因：

- agent teams 很强，但对新手来说复杂度也明显更高
- MCP 更适合项目已经接入 GitHub、Figma、Sentry、Notion 等外部系统后再上

---

## 6. 对这个项目，哪些角色最值得创建

这里要区分“开发角色”与“Claude 子代理角色”。

你的项目在工程上至少有 6 类真实工作：

- 架构规划
- Host App UI
- Finder Sync Extension
- Shared Core 与 Action Registry
- AI 与 CLI 集成
- QA / 发布 / 文档

Claude 角色建议和这些工作一一对应，不要按“前端/后端”这种 Web 习惯去切，因为你的项目是 macOS 原生桌面应用。

推荐角色如下：

1. `architect-planner`
   - 做阶段计划、模块边界、风险识别
   - 适合 Plan Mode

2. `finder-sync-engineer`
   - 专盯 Finder Sync Extension
   - 处理菜单上下文和宿主通信

3. `host-app-engineer`
   - 专盯菜单栏 App、窗口、设置、日志

4. `shared-core-engineer`
   - 专盯 Action Registry、上下文模型、配置模型、工具探测

5. `ai-integration-engineer`
   - 专盯 Claude/Codex CLI、Prompt 面板、流式结果窗口、写回文件流程

6. `qa-release-reviewer`
   - 专盯测试、手工验收、签名、扩展启用、README、Makefile

你暂时不需要创建十几个角色。角色太多会让你自己也失去控制。

---

## 7. 对这个项目，哪些 skills 最值得做

经验上，好的 skill 应该服务“反复出现的知识”和“高成本但模式稳定的流程”。

对于这个项目，最值得沉淀的是下面这些：

### `finder-sync-playbook`

用来统一这些知识：

- Finder Sync 能做什么，不能做什么
- 文件 / 文件夹 / 多选 / 空白目录四种上下文如何判断
- 复杂动作为什么要交给 Host App
- 扩展启用失败时怎么排查

### `action-registry-patterns`

用来统一：

- 新 action 必须如何注册
- 哪些逻辑放 `isVisible`
- 哪些逻辑放 `isEnabled`
- 哪些逻辑必须进入 Shared Core

### `ai-context-packaging`

用来统一：

- 单文件上下文如何截断
- 文件夹扫描深度如何控制
- 多选如何生成摘要
- 什么时候只传路径，什么时候传内容

### `app-signing-and-release`

用来统一：

- Debug / Release 构建时该检查什么
- Finder Sync Extension 嵌入检查
- 签名、验证、安装后引导

### `manual-qa-checklist`

用来统一：

- 文件场景验证
- 文件夹场景验证
- 多选场景验证
- 空白目录验证
- 无 CLI / 无权限 / 配置错误时的退化路径

---

## 8. 这个项目最推荐的日常开发工作流

这个部分很关键。你现在最需要的不是“会不会写复杂 prompt”，而是建立固定工作流。

### 阶段 A：做方案前

用 Plan Mode：

```bash
claude --permission-mode plan
```

然后让 Claude：

- 先读相关模块
- 总结当前架构
- 列出改动文件
- 写实现计划
- 写验证计划

官方最佳实践明确建议“先探索，再规划，最后编码”，并且在多文件任务、不熟悉代码库、复杂重构时优先用 Plan Mode。[best-practices](https://code.claude.com/docs/zh-CN/best-practices) [common-workflows](https://code.claude.com/docs/zh-CN/common-workflows)

### 阶段 B：正式实现

切回普通模式后再让 Claude 编码，并明确要求：

- 修改哪些文件
- 不能破坏哪些模块边界
- 修改后跑什么命令验证
- 输出哪些风险或未覆盖测试

### 阶段 C：完成后 review

让 `qa-release-reviewer` 或普通 Claude 做一次 review，重点看：

- Finder 菜单是否按上下文出现
- Host 与 Extension 的边界是否清晰
- 新 action 是否走注册系统
- 写入型动作是否二次确认
- Claude/Codex 缺失时是否有明确降级

### 阶段 D：复杂任务并行

只有当你已经有稳定的模块边界时，再开始：

- 用多个 worktree 并行做 Host App 和 Finder Sync
- 或者用 subagents 拆任务

官方也明确建议并行会话使用 worktrees，以避免改动相互污染。[common-workflows](https://code.claude.com/docs/zh-CN/common-workflows)

---

## 9. 这个项目该怎样使用 agent teams

我的建议很明确：先别把 agent teams 当默认工作模式。

原因：

- 你现在还在搭项目本身
- 模块边界、构建命令、测试命令、目录结构都还没完全稳定
- team lead、队友、共享任务列表、队友通信会增加心智负担

什么时候才建议用：

- 项目结构已经稳定
- 你要同时推进 3 个相对独立的问题
- 每个问题都能独立探索，不需要频繁互等

例如这时可以创建 team：

- 一个人负责 Finder Sync 菜单上下文
- 一个人负责 Host App 设置与窗口
- 一个人负责 AI 上下文打包与 CLI 调用

官方文档也强调，agent teams 最适合“互相不需要一直等待”的独立任务；队友共享任务列表，但每个人有自己的 context window。[agent-teams](https://code.claude.com/docs/zh-CN/agent-teams)

如果以后用了 agent teams，我建议你先坚持两条规则：

1. 队友数量先控制在 2 到 3 个
2. 队友只拿“边界清楚、产出明确”的任务

---

## 10. 对新手最容易忽略、但极其关键的事

### 10.1 先定义“怎么验证成功”

官方把“给 Claude 一种验证其工作的方式”列为最高杠杆实践之一。[best-practices](https://code.claude.com/docs/zh-CN/best-practices)

对于这个项目，验证标准必须尽早写进 `CLAUDE.md` 或 skill：

- 文件右键出现哪些菜单
- 文件夹右键出现哪些菜单
- 多选右键出现哪些菜单
- 空白目录右键出现哪些菜单
- CLI 存在时怎么走
- CLI 不存在时怎么退化
- 哪些写入动作必须确认

如果你不告诉 Claude 怎么验证，它就更容易产出“看起来合理但其实没跑通”的实现。

### 10.2 `CLAUDE.md` 不要写太长

官方明确建议保持短小、具体，如果内容变大就拆进 skill 或规则文件。[memory](https://code.claude.com/docs/zh-CN/memory) [features-overview](https://code.claude.com/docs/zh-CN/features-overview)

简单说：

- 高频、长期、所有任务都要遵守的，放 `CLAUDE.md`
- 专题知识、流程模板、检查清单，放 skill

### 10.3 敏感文件一定要 deny

这个项目未来很可能会碰到：

- API Key
- 本地证书
- 签名配置
- 模板目录中的私人文件
- 日志里的路径信息

这些不要靠“提醒 Claude 小心”解决，要靠 `permissions.deny` 解决。

### 10.4 不要太早重度依赖 hooks

Hook 很强，但太早加太多，会把探索阶段卡死。  
项目前期先要“能推进”，后期再把确定性规范逐步 hook 化。

### 10.5 复杂任务一定分两步

第一步：Plan Mode  
第二步：Normal Mode 实现

这条看起来慢，实际上是最省时间的。

---

## 11. 我对你这个项目的推荐起步顺序

如果你现在开始配置 Claude Code，我建议按这个顺序来：

1. 先配 `~/.claude/settings.json`
   - 默认模型
   - 通知 hook
   - 基础 teammateMode

2. 再写项目 `CLAUDE.md`
   - 项目目标
   - 三模块边界
   - 构建/测试/验证规则

3. 再写 `.claude/settings.json`
   - 允许常规构建命令
   - 敏感文件 deny
   - 高风险命令 ask

4. 然后只创建 2 个 subagents
   - `architect-planner`
   - `finder-sync-engineer`

5. 然后只创建 2 个 skills
   - `finder-sync-playbook`
   - `manual-qa-checklist`

6. 等项目开始分模块后，再补
   - `host-app-engineer`
   - `ai-integration-engineer`
   - `action-registry-patterns`
   - `app-signing-and-release`

7. 等项目进入并行开发阶段，再上
   - worktrees
   - agent teams

---

## 12. 一套非常实用的 Claude 使用习惯

建议你以后在这个项目里，优先这样跟 Claude 协作：

### 讨论方案

```text
进入 plan mode。先阅读与 Finder Sync 菜单生成相关的模块，说明当前设计，再给出一个只包含 MVP 的实现计划和风险。
```

### 进入实现

```text
按刚才的计划实现第一阶段，只做 Host App、Extension、Shared Core 的基础骨架。修改后运行构建并报告未覆盖项。
```

### 让 Claude review

```text
以代码审查模式检查这次改动，重点找 Finder Sync 上下文识别、Host/Extension 边界、危险写入确认和测试缺口。
```

### 让 subagent 做专题工作

```text
使用 finder-sync-engineer subagent 检查右键菜单在文件、文件夹、多选、空白目录四种上下文的生成逻辑，并列出风险。
```

---

## 13. 你现在最需要的不是“更复杂的提示”，而是“更好的项目约束”

这是我看完官方文档后，对你这种项目最重要的判断：

- Claude Code 很强，但前提是你给它稳定边界
- 边界最主要通过 `CLAUDE.md`、项目 `settings.json`、skills、subagents 提供
- 你越早把构建命令、测试方式、敏感文件边界、模块边界写清楚，Claude 就越像一个靠谱队友
- 如果这些没写清楚，Claude 也许能写代码，但很难长期稳定推进项目

---

## 14. 这份项目的最终推荐配置清单

现在就该做：

- `~/.claude/settings.json`
- `~/.claude/CLAUDE.md`
- `CLAUDE.md`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude/agents/architect-planner.md`
- `.claude/agents/finder-sync-engineer.md`
- `.claude/skills/finder-sync-playbook/SKILL.md`
- `.claude/skills/manual-qa-checklist/SKILL.md`

等项目开始实装后再做：

- `host-app-engineer`
- `ai-integration-engineer`
- `qa-release-reviewer`
- `action-registry-patterns`
- `ai-context-packaging`
- `app-signing-and-release`

后期再做：

- agent teams
- 更复杂 hooks
- MCP 集成

---

## 15. 参考资料

以下建议主要基于 Claude Code 官方文档，并结合你的项目形态做了落地化整理：

- [Claude Code 概述](https://code.claude.com/docs/zh-CN/overview)
- [创建自定义 subagents](https://code.claude.com/docs/zh-CN/sub-agents)
- [协调 Claude Code 会话团队](https://code.claude.com/docs/zh-CN/agent-teams)
- [使用 skills 扩展 Claude](https://code.claude.com/docs/zh-CN/skills)
- [Claude Code 如何工作](https://code.claude.com/docs/zh-CN/how-claude-code-works)
- [扩展 Claude Code](https://code.claude.com/docs/zh-CN/features-overview)
- [Claude 如何记住你的项目](https://code.claude.com/docs/zh-CN/memory)
- [常见工作流程](https://code.claude.com/docs/zh-CN/common-workflows)
- [Claude Code 最佳实践](https://code.claude.com/docs/zh-CN/best-practices)
- [Claude Code 设置](https://code.claude.com/docs/zh-CN/settings)
- [Hooks 参考](https://code.claude.com/docs/zh-CN/hooks)

---

## 16. 下一步最值得做的事

如果你认可这套方案，下一步最划算的不是马上写业务代码，而是让我继续帮你把下面这些文件直接初始化出来：

- `CLAUDE.md`
- `.claude/settings.json`
- `.claude/settings.local.json.example`
- 2 个 starter subagents
- 2 个 starter skills

这样你就能马上开始用 Claude 按正确的节奏开发这个项目，而不是边开发边想“Claude 到底该怎么配”。
