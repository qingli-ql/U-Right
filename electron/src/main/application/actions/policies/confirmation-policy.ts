import { dialog } from "electron";
import type { ConfirmationPolicy } from "../command-types";

export function createDialogConfirmationPolicy(): ConfirmationPolicy {
  return {
    async confirm(options) {
      const result = await dialog.showMessageBox({
        type: options.destructive ? "warning" : "question",
        title: options.title,
        message: options.message,
        buttons: ["Continue", "Cancel"],
        defaultId: 1,
        cancelId: 1
      });
      return result.response === 0;
    }
  };
}
