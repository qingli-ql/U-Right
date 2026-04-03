# Project Overview

- This project builds a macOS Finder super context-menu tool for macOS 26, called U-Right.
- The Host App direction is Electron + TypeScript + React + Vite.
- The product shape is a hybrid app: an Electron Host App plus a native Finder Sync Extension bridge plus shared integration code.
- Priority is reliable end-to-end functionality over feature count.

# Collaboration Style

- For multi-file or architecture-heavy work, explore first, then plan, then implement.
- For substantial work, prefer writing a short spec in `specs/` before coding.
- Before major refactors, explain the module boundary impact and verification approach.
- Keep explanations concise in Chinese unless deeper detail is requested.

# Architecture Rules

- The Electron Host App owns settings, windows, logs, AI execution, and other complex workflows.
- Finder Sync Extension must remain native and thin: collect Finder context, build menus, and delegate complex work.
- Shared integration code should contain typed models, action definitions, configuration schemas, context builders, IPC contracts, and tool-detection helpers.
- Do not assume pure Electron can directly replace Apple Finder Sync APIs. Treat Finder integration as a native bridge concern.
- New actions should be added through an action registry, not through scattered conditional logic.

# Editing Rules

- Prefer small focused types over giant manager objects.
- Prefer typed models and enums over unstructured dictionaries.
- Do not hardcode menu behavior when it should be driven by context and registry data.
- For any write or destructive behavior, require a confirmation path in the product design.

# Verification

- For Finder menu work, verify file, folder, multi-selection, and empty-directory contexts.
- For settings work, verify persistence and that both Host App and Extension can read the shared configuration.
- For AI work, verify both CLI-present and CLI-missing paths.
- For packaging work, verify the Electron app bundle, native extension embedding, code signing, and notarization path.
- For multi-file features or refactors, record the intended scope, module ownership, and verification plan in `specs/`.
- If build or test commands are not yet defined in the repo, inspect the project first and then document the commands you introduce.

# Safety

- Do not read secret files, certificates, or private signing assets unless explicitly requested.
- Treat extension enablement, signing, and external CLI execution as high-risk integration areas that need explicit verification.
