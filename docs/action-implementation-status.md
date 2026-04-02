# U-Right 动作实现状态

更新时间：2026-04-01

这份文档以 **当前 Electron 主线** 为准，记录 Finder 菜单里各类 action 的真实落地状态，避免菜单声明超前于实际执行能力。

## 已在 Electron 主线接通

- `create.new-file`
- `create.new-folder`
- `create.template.*`
- `open.terminal`
- `open.vscode`
- `open.cursor`
- `open.zed`
- `copy.path`
- `copy.relative-path`
- `finder.reveal`
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

## 已显示但仍建议继续打磨

- `copy.relative-path`
  当前已可用，但仍需要更多 Finder 多选 / 空白区域上下文验证。
- `file.duplicate`
  当前已支持文件和目录复制，但命名策略仍是 MVP 版本。
- `file.compress`
  当前使用 `/usr/bin/zip`，功能已通，但归档命名与冲突处理还可以更细。
- `git.status`
  当前结果通过 Result 窗口显示文本输出，后续可升级成更强的 Git 交互体验。
- `script.run.*`
  当前会把选中路径作为参数传给脚本，并在结果窗口显示输出；脚本发现和错误提示还可继续增强。

## 已注册但当前保持隐藏

这些动作在 `ActionRegistry` 中存在，但默认仍为隐藏，避免对用户过度承诺：

- `copy.filename`
- `copy.basename`
- `copy.extension`
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
- `view.toggle-hidden`
- `view.refresh`
- `folder.search`
- `folder.size`
- `folder.count`
- `multi.batch-rename`

## 维护规则

- 新增 action 时，先决定它属于：
  - 立即落地
  - 暂时隐藏
  - 仅原生对照路径保留
- 如果 Electron 主线还没有执行实现，不要把该动作默认暴露给用户。
- 修改 `ActionRegistry` 的默认可见性后，要同步检查 Electron 执行器是否已有真实处理逻辑。
