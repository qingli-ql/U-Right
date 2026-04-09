import { dialog } from "electron";
import type { ActionRequest, AppSettings } from "../../../contracts/contracts";
import { actionTitleFor } from "../../../contracts/action-registry";
import type { WindowController } from "../../desktop/windows/window-controller";
import { ActionExecutor, createPrefixActionCommand } from "./action-executor";
import { AI_ACTION_COMMANDS } from "./commands/ai";
import { CLIPBOARD_ACTION_COMMANDS } from "./commands/clipboard";
import { CREATE_ACTION_COMMANDS } from "./commands/create";
import { FILE_ACTION_COMMANDS } from "./commands/file";
import { OPEN_ACTION_COMMANDS } from "./commands/open";
import { PREFIX_DYNAMIC_HANDLERS } from "./commands/prefix-dynamic";
import { VIEW_GIT_ACTION_COMMANDS } from "./commands/view-git";
import { createDialogConfirmationPolicy } from "./policies/confirmation-policy";

const actionExecutor = new ActionExecutor({
  commands: [
    ...CLIPBOARD_ACTION_COMMANDS,
    ...CREATE_ACTION_COMMANDS,
    ...OPEN_ACTION_COMMANDS,
    ...FILE_ACTION_COMMANDS,
    ...VIEW_GIT_ACTION_COMMANDS,
    ...AI_ACTION_COMMANDS,
    ...PREFIX_DYNAMIC_HANDLERS.map((handler) => createPrefixActionCommand(handler))
  ],
  resolveActionTitle: actionTitleFor,
  confirmationPolicy: createDialogConfirmationPolicy(),
  async presentUnknownAction(actionID) {
    await dialog.showMessageBox({
      type: "info",
      title: "U-Right",
      message: `动作 ${actionID} 尚未实现。`
    });
  }
});

export async function dispatchActionRequest(
  request: ActionRequest,
  controller: WindowController,
  settings: AppSettings,
  scriptsDirectory: string
) {
  await actionExecutor.execute({
    request,
    controller,
    settings,
    scriptsDirectory
  });
}
