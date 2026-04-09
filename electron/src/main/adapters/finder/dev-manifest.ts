import fs from "node:fs";
import path from "node:path";

const DEV_MANIFEST_FILE = "dev-manifest.json";

export interface DevManifest {
  enabled?: boolean;
  rendererURL?: string;
  updatedAt?: string;
  source?: string;
}

export function resolveDevManifestPath(sharedRoot: string) {
  return process.env.URIGHT_DEV_MANIFEST_PATH?.trim() || path.join(sharedRoot, DEV_MANIFEST_FILE);
}

export function loadDevManifest(sharedRoot: string): DevManifest | null {
  const manifestPath = resolveDevManifestPath(sharedRoot);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as DevManifest;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      enabled: parsed.enabled === true,
      rendererURL: typeof parsed.rendererURL === "string" ? parsed.rendererURL.trim() : undefined,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
      source: typeof parsed.source === "string" ? parsed.source : undefined
    };
  } catch {
    return null;
  }
}

export function resolveDevRendererURL(sharedRoot: string) {
  const manifest = loadDevManifest(sharedRoot);
  if (!manifest?.enabled) {
    return null;
  }
  return manifest.rendererURL || null;
}
