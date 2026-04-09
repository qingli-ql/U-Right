import fs from "node:fs";
import path from "node:path";
import type { ActionRequest, RequestQueueEntrySummary, RequestQueueState } from "../../../contracts/contracts";
import { actionTitleFor } from "../../../contracts/defaults";
import { handleActionRequest } from "../actions";
import { appendLog } from "../../infrastructure/logging/logs";
import { decodeActionRequestWire } from "./request-wire";
import {
  getSharedPaths,
  resolveAppGroupIdentifier,
  type SharedPaths
} from "../../infrastructure/runtime/shared-paths";
import type { WindowController } from "../../desktop/windows/window-controller";

export interface RequestQueueProcessorOptions {
  controller: WindowController;
  paths?: SharedPaths;
  logger?: typeof appendLog;
  handler?: typeof handleActionRequest;
}

function parseRequestFile(filePath: string): { request: ActionRequest | null; error: string | null } {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return { request: decodeActionRequestWire(parsed), error: null };
  } catch (error) {
    return { request: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function listJsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => path.join(directory, entry));
}

function basenameWithoutExtension(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

function buildSummary(
  state: RequestQueueState,
  filePath: string,
  request: ActionRequest | null,
  error?: string
): RequestQueueEntrySummary {
  return {
    requestID: request?.id ?? basenameWithoutExtension(filePath),
    actionID: request?.actionID ?? null,
    actionTitle: request ? actionTitleFor(request.actionID) : null,
    state,
    sourceFileName: path.basename(filePath),
    selectionKind: request?.context.selectionKind ?? null,
    selectedCount: request?.context.selectedURLs.length ?? null,
    processedAt: new Date().toISOString(),
    error: error ?? null
  };
}

function writeSummary(directory: string, summary: RequestQueueEntrySummary) {
  const summaryPath = path.join(directory, `${summary.requestID}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
}

function transitionToProcessing(filePath: string, paths: SharedPaths): string | null {
  const processingPath = path.join(paths.processingRequestsDirectory, path.basename(filePath));
  try {
    fs.renameSync(filePath, processingPath);
    return processingPath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function finalizeProcessedRequest(
  state: RequestQueueState,
  filePath: string,
  request: ActionRequest | null,
  paths: SharedPaths,
  logger: typeof appendLog,
  error?: string
) {
  const summary = buildSummary(state, filePath, request, error);
  const targetDirectory = state === "done" ? paths.doneRequestsDirectory : paths.failedRequestsDirectory;
  writeSummary(targetDirectory, summary);
  fs.rmSync(filePath, { force: true });
  await logger(
    state === "done" ? "INFO" : "ERROR",
    "electron-queue",
    `${state === "done" ? "Completed" : "Failed"} request requestID=${summary.requestID} action=${summary.actionID ?? "-"} actionTitle=${summary.actionTitle ?? "-"} source=${summary.sourceFileName}${error ? ` error=${error}` : ""}`
  );
}

async function consumeProcessingFile(
  filePath: string,
  options: Required<Pick<RequestQueueProcessorOptions, "controller" | "logger" | "handler">> & { paths: SharedPaths }
) {
  const { request, error } = parseRequestFile(filePath);
  if (!request) {
    await finalizeProcessedRequest("failed", filePath, null, options.paths, options.logger, error ?? "Unknown parse error");
    return;
  }

  await options.logger(
    "INFO",
    "electron-queue",
    `Processing request requestID=${request.id} action=${request.actionID} actionTitle=${actionTitleFor(request.actionID)} selectionKind=${request.context.selectionKind} selectedCount=${request.context.selectedURLs.length} source=${path.basename(filePath)}`
  );

  try {
    await options.handler(request, options.controller);
    await finalizeProcessedRequest("done", filePath, request, options.paths, options.logger);
  } catch (consumeError) {
    const message = consumeError instanceof Error ? consumeError.stack ?? consumeError.message : String(consumeError);
    await finalizeProcessedRequest("failed", filePath, request, options.paths, options.logger, message);
  }
}

export async function processRequestQueueOnce(options: RequestQueueProcessorOptions): Promise<void> {
  const paths = options.paths ?? getSharedPaths();
  const logger = options.logger ?? appendLog;
  const handler = options.handler ?? handleActionRequest;

  for (const processingFile of listJsonFiles(paths.processingRequestsDirectory)) {
    await consumeProcessingFile(processingFile, { controller: options.controller, paths, logger, handler });
  }

  for (const incomingFile of listJsonFiles(paths.incomingRequestsDirectory)) {
    const processingFile = transitionToProcessing(incomingFile, paths);
    if (!processingFile) {
      continue;
    }
    await consumeProcessingFile(processingFile, { controller: options.controller, paths, logger, handler });
  }
}

export function startRequestQueueProcessor(options: RequestQueueProcessorOptions) {
  const paths = options.paths ?? getSharedPaths();
  const logger = options.logger ?? appendLog;

  void logger(
    "INFO",
    "electron-queue",
    `Watching request queue incoming=${paths.incomingRequestsDirectory} processing=${paths.processingRequestsDirectory} done=${paths.doneRequestsDirectory} failed=${paths.failedRequestsDirectory} appGroup=${resolveAppGroupIdentifier()} sharedRoot=${paths.root}`
  );

  let isDraining = false;
  let rerunRequested = false;

  const drain = async () => {
    if (isDraining) {
      rerunRequested = true;
      return;
    }
    isDraining = true;
    try {
      do {
        rerunRequested = false;
        await processRequestQueueOnce({ ...options, paths, logger });
      } while (rerunRequested);
    } finally {
      isDraining = false;
    }
  };

  void drain();

  fs.watch(paths.incomingRequestsDirectory, () => {
    void drain();
  });
}
