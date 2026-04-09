import fs from "node:fs";
import { getSharedPaths } from "../../infrastructure/runtime/shared-paths";

export type PreferredHostRuntime = "native-app" | "electron-dev" | "electron-app";

export function writePreferredHostRuntime(runtime: PreferredHostRuntime) {
  const { preferredHostRuntimeFile } = getSharedPaths();
  fs.writeFileSync(
    preferredHostRuntimeFile,
    JSON.stringify(
      {
        runtime,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );
}
