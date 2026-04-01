import fs from "node:fs";
import path from "node:path";
import type { ActionRequest } from "../shared/contracts";
import { getSharedPaths } from "./store";
import { handleActionRequest } from "./action-runner";
import type { WindowController } from "./index";

function parseRequest(filePath: string): ActionRequest | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as ActionRequest;
  } catch {
    return null;
  }
}

export function startRequestWatcher(controller: WindowController) {
  const { requestsDirectory } = getSharedPaths();

  const consume = (filePath: string) => {
    if (!filePath.endsWith(".json") || !fs.existsSync(filePath)) {
      return;
    }
    const request = parseRequest(filePath);
    fs.rmSync(filePath, { force: true });
    if (request) {
      void handleActionRequest(request, controller);
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
