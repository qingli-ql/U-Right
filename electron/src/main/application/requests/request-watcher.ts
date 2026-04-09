import type { WindowController } from "../../desktop/windows/window-controller";
import { startRequestQueueProcessor } from "./request-queue";

export function startRequestWatcher(controller: WindowController) {
  startRequestQueueProcessor({ controller });
}
