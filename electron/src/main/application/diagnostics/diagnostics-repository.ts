import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppDiagnostics } from "../../../contracts/contracts";
import {
  getSharedPaths,
  resolveAppGroupIdentifier,
  resolveLegacySharedRoot
} from "../../infrastructure/runtime/shared-paths";
import { loadFinderMenuSnapshot } from "../finder/finder-menu-snapshot-repository";
import { loadStoredSettingsDocument } from "../settings/settings-repository";
import { SETTINGS_VERSION } from "../settings/settings-migration";

export function loadAppDiagnostics(): AppDiagnostics {
  const paths = getSharedPaths();
  const document = loadStoredSettingsDocument();
  const finderMenuSnapshot = loadFinderMenuSnapshot();
  const currentContainer = paths.root;
  const legacyContainer = resolveLegacySharedRoot();
  const candidateGroupContainers = [currentContainer]
    .concat(fs.existsSync(legacyContainer) && legacyContainer !== currentContainer ? [legacyContainer] : [])
    .sort();
  const hasLegacyContainerConflict = fs.existsSync(legacyContainer)
    && legacyContainer !== currentContainer
    && !finderMenuSnapshot;
  const warning = hasLegacyContainerConflict
    ? "检测到历史遗留共享容器，且当前容器缺少 Finder 快照。请重新安装并重新加载 Finder Extension。"
    : null;
  const errors: string[] = [];
  if (!finderMenuSnapshot) {
    errors.push("缺少 Finder 实际菜单快照：finder-menu-snapshot.json 不存在或无法解析。");
  }
  if ((document?.version ?? 0) < SETTINGS_VERSION) {
    errors.push(`设置文档版本过旧：当前为 v${document?.version ?? 0}，预期为 v${SETTINGS_VERSION}。`);
  }
  const currentAppGroupIdentifier = resolveAppGroupIdentifier();
  if (finderMenuSnapshot?.appGroupIdentifier && finderMenuSnapshot.appGroupIdentifier !== currentAppGroupIdentifier) {
    errors.push(`Finder 快照 app group 与 Electron 不一致：snapshot=${finderMenuSnapshot.appGroupIdentifier} electron=${currentAppGroupIdentifier}`);
  }
  const availableScriptNames = fs.existsSync(paths.scriptsDirectory)
    ? fs.readdirSync(paths.scriptsDirectory)
      .filter((entry) => {
        const candidate = path.join(paths.scriptsDirectory, entry);
        return path.extname(entry) !== "" || fs.statSync(candidate).mode & 0o111;
      })
      .sort()
    : [];

  return {
    appGroupIdentifier: currentAppGroupIdentifier,
    sharedRoot: paths.root,
    settingsFile: paths.settingsFile,
    settingsVersion: document?.version ?? 0,
    settingsUpdatedAt: document?.updatedAt ?? null,
    candidateGroupContainers,
    warning,
    errors,
    availableScriptNames,
    finderMenuSnapshot
  };
}
