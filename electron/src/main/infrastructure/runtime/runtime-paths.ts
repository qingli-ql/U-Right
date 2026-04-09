import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const APP_GROUP_INFO_KEY = "URightAppGroupIdentifier";
const RENDERER_DEV_SERVER_ENV = "VITE_DEV_SERVER_URL";
const APP_ICON_RELATIVE_PATH = ["Resources", "App", "Assets.xcassets", "AppIcon.appiconset"];
const APP_ICNS_FILE = "U-Right.icns";
const BRAND_SOURCE_FILE = "brand-source.svg";
const TRAY_ICON_FILE = "tray-icon.png";

function uniquePaths(paths: Array<string | undefined | null>) {
  return Array.from(new Set(paths.filter((value): value is string => Boolean(value))));
}

function existingPath(paths: Array<string | undefined | null>) {
  return uniquePaths(paths).find((candidate) => fs.existsSync(candidate));
}

function repoRootFromCompiledMain() {
  return path.resolve(__dirname, "../../../../../../");
}

function appRootCandidates() {
  const appPath = typeof process.resourcesPath === "string"
    ? path.resolve(process.resourcesPath, "..")
    : undefined;
  return uniquePaths([
    process.env.URIGHT_APP_ROOT,
    appPath,
    repoRootFromCompiledMain()
  ]);
}

function resourceRootCandidates() {
  return uniquePaths([
    process.resourcesPath,
    path.join(repoRootFromCompiledMain(), "electron"),
    repoRootFromCompiledMain()
  ]);
}

export function resolveCurrentInfoPlistPath() {
  return existingPath([
    process.env.URIGHT_INFO_PLIST_PATH,
    path.resolve(process.execPath, "..", "..", "Info.plist")
  ]);
}

export function readInfoPlistValue(infoPlistPath: string | undefined, key: string) {
  if (!infoPlistPath || !fs.existsSync(infoPlistPath)) {
    return null;
  }
  try {
    const raw = execFileSync(
      "/usr/bin/plutil",
      ["-extract", key, "raw", "-o", "-", infoPlistPath],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    return raw || null;
  } catch {
    return null;
  }
}

export function readCurrentAppGroupIdentifier() {
  const value = readInfoPlistValue(resolveCurrentInfoPlistPath(), APP_GROUP_INFO_KEY);
  if (!value || value.includes("$(")) {
    return null;
  }
  return value;
}

export function resolvePreloadPath() {
  const preloadPath = existingPath([
    process.env.URIGHT_PRELOAD_PATH,
    path.join(__dirname, "../../bootstrap/preload.js")
  ]);
  if (!preloadPath) {
    throw new Error("Electron preload bundle is missing.");
  }
  return preloadPath;
}

export function resolvePackagedRendererEntry() {
  const rendererPath = existingPath([
    process.env.URIGHT_RENDERER_INDEX_PATH,
    path.join(__dirname, "../../../../renderer/index.html"),
    path.join(process.resourcesPath, "electron/dist/renderer/index.html"),
    path.join(process.resourcesPath, "dist/renderer/index.html"),
    path.join(process.resourcesPath, "renderer/index.html"),
    path.join(repoRootFromCompiledMain(), "electron/dist/renderer/index.html")
  ]);
  if (!rendererPath) {
    throw new Error("Electron renderer entry is missing.");
  }
  return rendererPath;
}

export function resolveRendererURL(devServerURL?: string | null) {
  const explicitURL = devServerURL?.trim() || process.env[RENDERER_DEV_SERVER_ENV]?.trim();
  if (explicitURL) {
    return explicitURL;
  }
  return `file://${resolvePackagedRendererEntry()}`;
}

export function resolveAppIconPath(fileName: string) {
  return existingPath([
    process.env.URIGHT_ICON_PATH && path.join(process.env.URIGHT_ICON_PATH, fileName),
    ...appRootCandidates().map((root) => path.join(root, ...APP_ICON_RELATIVE_PATH, fileName)),
    ...resourceRootCandidates().map((root) => path.join(root, ...APP_ICON_RELATIVE_PATH, fileName)),
    ...resourceRootCandidates().map((root) => path.join(root, "AppIcon.appiconset", fileName))
  ]);
}

export function resolveIcnsIconPath() {
  return existingPath([
    process.env.URIGHT_ICNS_ICON_PATH,
    process.resourcesPath && path.join(process.resourcesPath, "icon.icns"),
    ...appRootCandidates().map((root) => path.join(root, "Contents", "Resources", "icon.icns")),
    ...appRootCandidates().map((root) => path.join(root, "Resources", "App", APP_ICNS_FILE)),
    ...resourceRootCandidates().map((root) => path.join(root, "Resources", "App", APP_ICNS_FILE)),
    ...resourceRootCandidates().map((root) => path.join(root, APP_ICNS_FILE))
  ]);
}

export function resolveBrandSourcePath() {
  return existingPath([
    process.env.URIGHT_BRAND_SOURCE_PATH,
    process.resourcesPath && path.join(process.resourcesPath, "branding", BRAND_SOURCE_FILE),
    ...appRootCandidates().map((root) => path.join(root, ...APP_ICON_RELATIVE_PATH, BRAND_SOURCE_FILE)),
    ...resourceRootCandidates().map((root) => path.join(root, ...APP_ICON_RELATIVE_PATH, BRAND_SOURCE_FILE)),
    ...resourceRootCandidates().map((root) => path.join(root, "AppIcon.appiconset", BRAND_SOURCE_FILE))
  ]);
}

export function resolveTrayIconPath() {
  return existingPath([
    process.env.URIGHT_TRAY_ICON_PATH,
    process.resourcesPath && path.join(process.resourcesPath, TRAY_ICON_FILE),
    ...appRootCandidates().map((root) => path.join(root, "Resources", "App", "U-Right.iconset", "icon_32x32@2x.png")),
    ...appRootCandidates().map((root) => path.join(root, ...APP_ICON_RELATIVE_PATH, "icon_32x32@2x.png")),
    ...resourceRootCandidates().map((root) => path.join(root, "Resources", "App", "U-Right.iconset", "icon_32x32@2x.png")),
    ...resourceRootCandidates().map((root) => path.join(root, ...APP_ICON_RELATIVE_PATH, "icon_32x32@2x.png"))
  ]);
}
