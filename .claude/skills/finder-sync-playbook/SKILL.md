---
name: finder-sync-playbook
description: Finder Sync extension rules, menu-context behavior, and integration pitfalls for this macOS Finder tool project.
---

# When To Use

- Use when changing Finder Sync menus, context classification, extension-host communication, or extension enablement flows.

# Core Principles

- Keep the Finder Sync Extension thin.
- Let the Host App own windows, settings, logging, AI execution, and complex actions.
- Put shared models, context builders, and action definitions into Shared Core.
- Prefer dynamic menu generation through registry data instead of ad hoc conditionals.

# Context Checklist

- Single file
- Single folder
- Multi-selection
- Empty directory / Finder blank area

# Verification Checklist

- Confirm the extension is enabled in system settings.
- Confirm the menu appears in Finder.
- Confirm the selected context type is classified correctly.
- Confirm hidden or disabled menu items behave intentionally.
- Confirm complex actions hand off to the Host App cleanly.

# Common Risks

- Treating blank-area context like a selected folder without checking Finder APIs carefully.
- Letting too much logic live inside the extension instead of Shared Core or Host App.
- Forgetting to verify behavior when required tools or CLIs are missing.
