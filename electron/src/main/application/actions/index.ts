import type { ActionRequest } from "../../../contracts/contracts";
import type { WindowController } from "../../desktop/windows/window-controller";
import { appendLog } from "../../infrastructure/logging/logs";
import { getSharedPaths } from "../../infrastructure/runtime/shared-paths";
import { loadSettings } from "../settings/settings-repository";
import { actionTitleFor } from "../../../contracts/action-registry";
import { dispatchActionRequest } from "./dispatcher";

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
