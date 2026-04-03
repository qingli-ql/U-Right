# U-Right 动作实现状态

更新时间：2026-04-03

本文档记录 Electron 主线动作的真实实现状态。

## 已接通

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

## 已接通但仍是 MVP/beta

- `copy.relative-path`
- `view.refresh`
- `view.toggle-hidden`
- `file.duplicate`
- `file.compress`
- `git.status`
- `open.custom.*`
- `script.run.*`

## 已注册但默认隐藏

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
- `folder.search`
- `folder.size`
- `folder.count`
- `multi.batch-rename`

## 本轮结构变化

- 执行入口改为薄层：`electron/src/main/action-runner.ts`
- 统一分发下沉到：`electron/src/main/action-runner/dispatcher.ts`
- 目前采用“direct handlers + prefix handlers”模式：
  - direct：固定 actionID
  - prefix：`create.template.*` / `open.custom.*` / `script.run.*`

## 使用规则

- 已接通动作才允许默认暴露
- 未完成动作继续隐藏
- 改动动作可见性时，必须同步检查：
  - `ActionRegistry`
  - Settings Preview
  - Electron 执行器
- 改动 action 定义后，必须执行：

```bash
npm run validate:action-registry
```
