import type { ActionRequest, AppSettings } from "../../../contracts/contracts";
import type { WindowController } from "../../desktop/windows/window-controller";
import type { ActionCommand, ActionExecutionContext, ActionHandler, ConfirmationPolicy } from "./command-types";

export interface ActionExecutorInput {
  request: ActionRequest;
  controller: WindowController;
  settings: AppSettings;
  scriptsDirectory: string;
}

export interface ActionExecutorDependencies {
  commands: ActionCommand[];
  resolveActionTitle: (actionID: string) => string;
  confirmationPolicy: ConfirmationPolicy;
  presentUnknownAction: (actionID: string) => Promise<void>;
}

export class ActionExecutor {
  constructor(private readonly dependencies: ActionExecutorDependencies) {}

  async execute(input: ActionExecutorInput): Promise<void> {
    const ctx: ActionExecutionContext = {
      request: input.request,
      controller: input.controller,
      settings: input.settings,
      scriptsDirectory: input.scriptsDirectory,
      actionTitle: this.dependencies.resolveActionTitle(input.request.actionID),
      confirmationPolicy: this.dependencies.confirmationPolicy
    };

    for (const command of this.dependencies.commands) {
      const handled = await command.tryExecute(ctx);
      if (handled) {
        return;
      }
    }

    await this.dependencies.presentUnknownAction(input.request.actionID);
  }
}

export function createDirectActionCommand(actionID: string, handler: ActionHandler): ActionCommand {
  return {
    async tryExecute(ctx) {
      if (ctx.request.actionID !== actionID) {
        return false;
      }
      await handler(ctx);
      return true;
    }
  };
}

export function createPrefixActionCommand(handler: ActionHandler): ActionCommand {
  return {
    async tryExecute(ctx) {
      return handler(ctx);
    }
  };
}

