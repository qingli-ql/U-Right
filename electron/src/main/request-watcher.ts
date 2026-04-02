import fs from "node:fs";
import path from "node:path";
import type { ActionRequest } from "../shared/contracts";
import { actionTitleFor } from "../shared/defaults";
import { getSharedPaths, resolveAppGroupIdentifier } from "./store";
import { handleActionRequest } from "./action-runner";
import type { WindowController } from "./index";
import { appendLog } from "./logs";

function parseRequest(filePath: string): ActionRequest | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as ActionRequest;
  } catch {
    return null;
  }
}

export function startRequestWatcher(controller: WindowController) {
  const { requestsDirectory, root } = getSharedPaths();
  void appendLog("INFO", "electron-watcher", `Watching requests directory: ${requestsDirectory} appGroup=${resolveAppGroupIdentifier()} sharedRoot=${root}`);

  const consume = (filePath: string) => {
    if (!filePath.endsWith(".json") || !fs.existsSync(filePath)) {
      return;
    }
    const request = parseRequest(filePath);
    fs.rmSync(filePath, { force: true });
    if (request) {
      void appendLog("INFO", "electron-watcher", `Consumed request requestID=${request.id} action=${request.actionID} actionTitle=${actionTitleFor(request.actionID)} selectionKind=${request.context.selectionKind} selectedCount=${request.context.selectedURLs.length}`);
      void handleActionRequest(request, controller);
    } else {
      void appendLog("ERROR", "electron-watcher", `Failed to parse request file: ${filePath}`);
    }
  };

  for (const entry of fs.readdirSync(requestsDirectory)) {
    consume(path.join(requestsDirectory, entry));
  }

  fs.watch(requestsDirectory, (_, fileName) => {
    if (!fileName) {
      return;
    }
    setTimeout(() => consume(path.join(requestsDirectory, fileName.toString())), 120);
  });
}
