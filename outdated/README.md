# Specs Directory

This directory stores lightweight implementation specs for work that should not go directly from prompt to code.

Use a spec when the task is:

- multi-file
- architecture-heavy
- maintainability-sensitive
- ambiguous enough that coding immediately would create drift

The goal is not heavyweight process. The goal is to make sure we are aligned on:

- what changes
- what does not change
- which module owns the change
- how the change will be verified

## When To Create A Spec

Create a spec before implementation for:

- new user-visible features spanning multiple modules
- refactors that change module boundaries or contracts
- settings changes that must affect preview, Finder menu, and execution consistently
- new actions that touch registry, evaluator, execution, and UI
- risky integration work such as Finder bridge, AI execution, packaging, or shared contracts

Skip a formal spec only when the change is truly small and local, such as:

- typo fixes
- narrow bug fixes inside one file
- low-risk copy updates

## File Naming

Use:

`specs/YYYY-MM-DD-short-topic.md`

Example:

`specs/2026-04-03-action-runner-handler-split.md`

## Recommended Workflow

1. Start from [task-input-template.md](/Users/qingli/Projects/agent_servers/claude-uright/specs/task-input-template.md).
2. Write a short spec using the structure in the `spec-driven-delivery` skill.
3. Implement in thin slices:
   shared contract -> execution path -> UI/settings -> verification -> docs
4. Record what was actually verified.
5. Update status docs only after behavior and verification agree.

## Minimum Spec Sections

Every spec should cover:

- Context
- Scope
- Behavior
- Ownership
- Risks
- Verification
- Task breakdown

## Repo-Specific Guardrails

- Finder Sync stays thin.
- Shared stays the source of truth for action definitions, evaluators, and contracts.
- Electron Host owns settings, prompt/result UX, logs, and complex execution.
- New actions go through registry first, then execution, then validation.
- Unfinished capabilities stay hidden or gated.
- Do not use docs to claim a feature is done before the user path is real.

## Verification Reminder

For product-path changes, consider:

- Finder file context
- Finder folder context
- Finder multi-selection context
- Finder blank-area context
- settings preview vs Finder actual menu
- CLI-present vs CLI-missing AI paths
- `/Applications/U-Right.app` as the authoritative install target
