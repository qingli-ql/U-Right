---
name: manual-qa-checklist
description: Manual QA checklist for validating Finder contexts, settings persistence, AI fallbacks, and safe file operations in this project.
disable-model-invocation: true
---

# When To Use

- Use before closing a substantial task.
- Use after menu, settings, AI, template, or file-writing changes.
- Use for release readiness reviews.

# Finder Context QA

- Verify single file context.
- Verify single folder context.
- Verify mixed or multiple selection context.
- Verify empty directory context.

# Settings QA

- Verify settings persist after relaunch.
- Verify shared settings remain readable by both Host App and Extension.
- Verify invalid paths or missing tools produce understandable errors.

# AI QA

- Verify CLI-present behavior for Claude and Codex paths.
- Verify CLI-missing fallback or error guidance.
- Verify prompt confirmation UI shows the intended context.
- Verify streamed results remain readable and copyable.

# Safety QA

- Verify overwrite or destructive actions require confirmation.
- Verify actions that modify files clearly identify the target.
- Verify sensitive values are not written into logs.

# Release QA

- Verify build instructions still match the repo.
- Verify extension installation and enablement guidance still makes sense.
- Verify any new external dependency is documented.
