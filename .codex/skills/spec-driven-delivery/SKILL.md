---
name: spec-driven-delivery
description: Use when a task needs to be planned and implemented through specs instead of jumping straight from prompt to code, especially for multi-file features, refactors, AI-assisted delivery, or maintainability-sensitive work.
---

# When To Use

- Use for multi-file features, refactors, or architecture-heavy changes.
- Use when the request is still vague and needs requirements, design, and task breakdown first.
- Use when AI should help deliver code without losing maintainability.
- Use when a task spans product behavior, module boundaries, and verification.

# Goal

Move from `prompt -> code` to:

`prompt -> spec -> design -> tasks -> implementation -> verification`

The spec becomes the working source of truth for the change.

# Core Rules

- Do not start coding before requirements, boundaries, and verification are explicit.
- Keep one source of truth for behavior, IDs, and settings; remove parallel definitions instead of patching around them.
- Prefer small, verifiable increments over broad "finished-looking" changes.
- Default unfinished capabilities to hidden or gated states instead of fake completeness.
- Every implementation step must name its owner module, changed contract, and validation path.

# Workflow

## 1. Frame The Request

Turn the user request into a short problem statement:

- What user outcome changes?
- What is in scope?
- What is explicitly out of scope?
- What existing module should own the logic?
- What would make this change unsafe or hard to maintain?

If the task is ambiguous, resolve ambiguity in the spec first, not in code.

## 2. Write A Lightweight Spec

Create or update a short spec before implementation. Include:

- Context and problem
- User-visible behavior
- Non-goals
- Module boundaries
- Data/contracts affected
- Risks
- Verification

Use [references/spec-template.md](references/spec-template.md) when starting from scratch.

# 3. Design The Change

Translate the spec into concrete engineering decisions:

- Which module owns behavior?
- Which shared contract or registry is the source of truth?
- What existing paths should be reused?
- What should be centralized rather than copied?
- What migration or compatibility behavior is temporary vs permanent?

Prefer extending registries, typed models, and handlers over scattering new conditionals.

## 4. Break Into Tasks

Split work into small tasks that each end in a verifiable state.

Each task should answer:

- What file or module changes?
- What invariant is being protected?
- How will we know it works?

Use [references/task-template.md](references/task-template.md) for larger changes.

Good task shape:

- shared contract change
- host execution wiring
- UI/settings integration
- tests or smoke validation
- docs/status update

## 5. Implement In Thin Vertical Slices

Implement one slice at a time.

Preferred order:

1. Shared contract or registry
2. Core execution path
3. UI / settings / preview integration
4. Verification
5. Documentation or status updates

For each slice:

- avoid mixing unrelated cleanup
- keep error handling and logging boundaries clear
- centralize normalization logic for repeated edge cases
- do not expose unfinished behavior by default

## 6. Verify Before Expanding

Run the narrowest meaningful verification first, then broader regression:

- build or typecheck
- smoke test of changed path
- context-specific manual validation
- cross-surface consistency check

For this repo, always think about:

- Finder file context
- Finder folder context
- Finder multi-selection context
- Finder blank-area context
- settings preview vs actual Finder menu
- CLI-present vs CLI-missing AI paths

## 7. Close The Loop

After implementation, update the project truth:

- status docs
- action visibility
- validation notes
- follow-up risks

Do not mark work as complete if behavior, visibility, and verification disagree.

# Maintainability Heuristics

- If the same rule appears in menu generation, preview, and execution, centralize it.
- If two platforms need the same IDs or contracts, generate one side from the other.
- If a fallback hides a configuration error, prefer failing loudly during development.
- If a feature is "almost done", keep it hidden until the user path is real.
- If a change needs many special cases, the abstraction is probably wrong.
- If verification is hand-wavy, the task is not ready to implement.

# Anti-Patterns

- Coding directly from a loosely worded prompt.
- Letting UI wording get ahead of actual execution support.
- Maintaining parallel config shapes or duplicate enums manually.
- Fixing drift by adding another adapter layer without a removal plan.
- Declaring tasks complete without command-level or scenario-level verification.

# Deliverable Shape

When using this skill, structure work output in this order:

1. Problem framing
2. Short spec
3. Design decisions
4. Task breakdown
5. Implementation
6. Verification
7. Residual risks

# Repo-Specific Notes

For this project:

- Keep Finder Sync thin.
- Put shared action definitions, settings schemas, and evaluators in shared code.
- Let the Electron host own complex workflows, logs, prompts, and execution.
- Add new actions through the registry first, then execution, then verification.
- Use `make dev` as the default integrated development path.
