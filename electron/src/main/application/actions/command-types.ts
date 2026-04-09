import type { ActionRequest, AppSettings } from "../../../contracts/contracts";
import type { WindowController } from "../../desktop/windows/window-controller";

export interface ConfirmationPolicy {
  confirm(options: { title: string; message: string; destructive?: boolean }): Promise<boolean>;
}

export interface ActionExecutionContext {
  request: ActionRequest;
  controller: WindowController;
  settings: AppSettings;
  scriptsDirectory: string;
  actionTitle: string;
  confirmationPolicy: ConfirmationPolicy;
}

export type ActionHandler = (ctx: ActionExecutionContext) => Promise<boolean>;

export interface ActionCommand {
  tryExecute(ctx: ActionExecutionContext): Promise<boolean>;
}
