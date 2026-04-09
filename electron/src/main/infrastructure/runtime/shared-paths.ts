import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readCurrentAppGroupIdentifier } from "./runtime-paths";

const APP_GROUP_INFO_KEY = "URightAppGroupIdentifier";
const LEGACY_APP_GROUP = "group.com.openai.uright";
const SETTINGS_FILE = "settings.json";
const SETTINGS_BACKUP_FILE = "settings.backup.json";
const REQUESTS_DIR = "Requests";
const LOG_FILE = "uright.log";
const FINDER_MENU_SNAPSHOT_FILE = "finder-menu-snapshot.json";
const PREFERRED_HOST_RUNTIME_FILE = "preferred-host-runtime.json";

export interface SharedPaths {
  root: string;
  settingsFile: string;
  backupSettingsFile: string;
  requestsRootDirectory: string;
  incomingRequestsDirectory: string;
  processingRequestsDirectory: string;
  doneRequestsDirectory: string;
  failedRequestsDirectory: string;
  templatesDirectory: string;
  scriptsDirectory: string;
  logFile: string;
  finderMenuSnapshotFile: string;
  preferredHostRuntimeFile: string;
}

function copyIfMissing(source: string, destination: string) {
  if (!fs.existsSync(source) || fs.existsSync(destination)) {
    return;
  }
  fs.copyFileSync(source, destination);
}

function sharedPathsForRoot(root: string): SharedPaths {
  fs.mkdirSync(root, { recursive: true });
  const requestsRootDirectory = path.join(root, REQUESTS_DIR);
  const incomingRequestsDirectory = path.join(requestsRootDirectory, "incoming");
  const processingRequestsDirectory = path.join(requestsRootDirectory, "processing");
  const doneRequestsDirectory = path.join(requestsRootDirectory, "done");
  const failedRequestsDirectory = path.join(requestsRootDirectory, "failed");
  const templatesDirectory = path.join(root, "Templates");
  const scriptsDirectory = path.join(root, "Scripts");
  fs.mkdirSync(incomingRequestsDirectory, { recursive: true });
  fs.mkdirSync(processingRequestsDirectory, { recursive: true });
  fs.mkdirSync(doneRequestsDirectory, { recursive: true });
  fs.mkdirSync(failedRequestsDirectory, { recursive: true });
  fs.mkdirSync(templatesDirectory, { recursive: true });
  fs.mkdirSync(scriptsDirectory, { recursive: true });
  return {
    root,
    settingsFile: path.join(root, SETTINGS_FILE),
    backupSettingsFile: path.join(root, SETTINGS_BACKUP_FILE),
    requestsRootDirectory,
    incomingRequestsDirectory,
    processingRequestsDirectory,
    doneRequestsDirectory,
    failedRequestsDirectory,
    templatesDirectory,
    scriptsDirectory,
    logFile: path.join(root, LOG_FILE),
    finderMenuSnapshotFile: path.join(root, FINDER_MENU_SNAPSHOT_FILE),
    preferredHostRuntimeFile: path.join(root, PREFERRED_HOST_RUNTIME_FILE)
  };
}

export function resolveLegacySharedRoot(): string {
  return path.join(os.homedir(), "Library", "Group Containers", LEGACY_APP_GROUP);
}

function migrateLegacyContainerIfNeeded(targetRoot: string) {
  if (path.basename(targetRoot) === LEGACY_APP_GROUP) {
    return;
  }
  const legacyRoot = resolveLegacySharedRoot();
  if (!fs.existsSync(legacyRoot)) {
    return;
  }
  const targetPaths = sharedPathsForRoot(targetRoot);
  const legacyPaths = sharedPathsForRoot(legacyRoot);
  copyIfMissing(legacyPaths.settingsFile, targetPaths.settingsFile);
  copyIfMissing(legacyPaths.backupSettingsFile, targetPaths.backupSettingsFile);
  copyIfMissing(legacyPaths.finderMenuSnapshotFile, targetPaths.finderMenuSnapshotFile);
}

export function resolveAppGroupIdentifier(): string {
  const resolved = process.env.APP_GROUP_IDENTIFIER?.trim()
    || process.env[APP_GROUP_INFO_KEY]?.trim()
    || readCurrentAppGroupIdentifier();
  if (!resolved) {
    throw new Error(
      "Missing app group identifier. Set APP_GROUP_IDENTIFIER (or URightAppGroupIdentifier) or launch from a packaged U-Right.app bundle."
    );
  }
  if (resolved === LEGACY_APP_GROUP) {
    throw new Error(
      `Refusing to run with legacy app group (${LEGACY_APP_GROUP}). Please use the signed team-based app group identifier.`
    );
  }
  return resolved;
}

export function resolveSharedRoot(): string {
  const appGroupIdentifier = resolveAppGroupIdentifier();
  const groupContainer = path.join(os.homedir(), "Library", "Group Containers", appGroupIdentifier);
  migrateLegacyContainerIfNeeded(groupContainer);
  return groupContainer;
}

export function getSharedPaths(): SharedPaths {
  return sharedPathsForRoot(resolveSharedRoot());
}
