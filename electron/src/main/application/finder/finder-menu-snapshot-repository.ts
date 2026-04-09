import fs from "node:fs";
import type { FinderMenuSnapshot } from "../../../contracts/contracts";
import { getSharedPaths } from "../../infrastructure/runtime/shared-paths";

export function loadFinderMenuSnapshot(): FinderMenuSnapshot | null {
  const { finderMenuSnapshotFile } = getSharedPaths();
  if (!fs.existsSync(finderMenuSnapshotFile)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(finderMenuSnapshotFile, "utf8")) as FinderMenuSnapshot;
  } catch {
    return null;
  }
}
