import type { ActionRequest } from "../shared/contracts";
import type { WindowController } from "./index";
import { appendLog } from "./logs";
import { getSharedPaths, loadSettings } from "./store";
import { actionTitleFor } from "../shared/action-registry";
import { dispatchActionRequest } from "./action-runner/dispatcher";

export async function handleActionRequest(request: ActionRequest, controller: WindowController) {
  const actionTitle = actionTitleFor(request.actionID);
  const settings = loadSettings();

  await appendLog(
    "INFO",
    "electron-action",
    `Begin requestID=${request.id} action=${request.actionID} actionTitle=${actionTitle} selectionKind=${request.context.selectionKind} selectedCount=${request.context.selectedURLs.length}`
  );

  try {
    await dispatchActionRequest(request, controller, settings, getSharedPaths().scriptsDirectory);
  } catch (error) {
    await appendLog(
      "ERROR",
      "electron-action",
      `Failed requestID=${request.id} action=${request.actionID} actionTitle=${actionTitle} error=${error instanceof Error ? error.stack ?? error.message : String(error)}`
    );
    throw error;
  }
}
