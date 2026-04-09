#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function loadSummary(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function buildPaths(root) {
  const requestsRootDirectory = path.join(root, "Requests");
  const incomingRequestsDirectory = path.join(requestsRootDirectory, "incoming");
  const processingRequestsDirectory = path.join(requestsRootDirectory, "processing");
  const doneRequestsDirectory = path.join(requestsRootDirectory, "done");
  const failedRequestsDirectory = path.join(requestsRootDirectory, "failed");

  for (const directory of [
    incomingRequestsDirectory,
    processingRequestsDirectory,
    doneRequestsDirectory,
    failedRequestsDirectory,
    path.join(root, "Templates"),
    path.join(root, "Scripts")
  ]) {
    fs.mkdirSync(directory, { recursive: true });
  }

  return {
    root,
    settingsFile: path.join(root, "settings.json"),
    backupSettingsFile: path.join(root, "settings.backup.json"),
    requestsRootDirectory,
    incomingRequestsDirectory,
    processingRequestsDirectory,
    doneRequestsDirectory,
    failedRequestsDirectory,
    templatesDirectory: path.join(root, "Templates"),
    scriptsDirectory: path.join(root, "Scripts"),
    logFile: path.join(root, "uright.log"),
    finderMenuSnapshotFile: path.join(root, "finder-menu-snapshot.json"),
    preferredHostRuntimeFile: path.join(root, "preferred-host-runtime.json")
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const modulePath = path.join(repoRoot, "electron", "dist", "main", "main", "application", "requests", "request-queue.js");
  if (!fs.existsSync(modulePath)) {
    fail(`Compiled request queue module not found: ${modulePath}`);
  }

  const { processRequestQueueOnce } = require(modulePath);
  if (typeof processRequestQueueOnce !== "function") {
    fail("Compiled request queue module must export processRequestQueueOnce()");
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "uright-request-queue-"));
  const paths = buildPaths(tempRoot);

  const validRequest = {
    id: "REQ-ONE",
    actionID: "open.terminal",
    createdAt: "2026-04-07T00:00:00.000Z",
    context: {
      selectedURLs: ["/tmp/example.txt"],
      primaryURL: "/tmp/example.txt",
      currentDirectoryURL: "/tmp",
      resolvedTargetDirectory: "/tmp",
      resolvedPrimaryTarget: "/tmp/example.txt",
      resolvedSelectionDirectory: "/tmp",
      selectionKind: "file",
      detectedTools: {},
      fileMetadata: []
    }
  };
  const failingRequest = {
    ...validRequest,
    id: "REQ-TWO",
    actionID: "file.rename"
  };
  const recoveredRequest = {
    ...validRequest,
    id: "REQ-RECOVERED",
    actionID: "copy.path"
  };

  writeJson(path.join(paths.incomingRequestsDirectory, "REQ-ONE.json"), validRequest);
  writeJson(path.join(paths.incomingRequestsDirectory, "REQ-TWO.json"), failingRequest);
  fs.writeFileSync(path.join(paths.incomingRequestsDirectory, "BROKEN.json"), "{not-json", "utf8");
  writeJson(path.join(paths.processingRequestsDirectory, "REQ-RECOVERED.json"), recoveredRequest);

  const handledRequests = [];
  const logs = [];
  const controller = {};

  await processRequestQueueOnce({
    controller,
    paths,
    logger: async (level, subsystem, message) => {
      logs.push({ level, subsystem, message });
    },
    handler: async (request) => {
      handledRequests.push(request.id);
      if (request.id === "REQ-TWO") {
        throw new Error("simulated-dispatch-failure");
      }
    }
  });

  assert(handledRequests.join(",") === "REQ-RECOVERED,REQ-ONE,REQ-TWO", `Unexpected handled request order: ${handledRequests.join(",")}`);
  assert(fs.readdirSync(paths.incomingRequestsDirectory).length === 0, "Incoming directory should be empty after processing");
  assert(fs.readdirSync(paths.processingRequestsDirectory).length === 0, "Processing directory should be empty after processing");

  const doneSummaries = fs.readdirSync(paths.doneRequestsDirectory).sort();
  const failedSummaries = fs.readdirSync(paths.failedRequestsDirectory).sort();
  assert(doneSummaries.join(",") === "REQ-ONE.json,REQ-RECOVERED.json", `Unexpected done summaries: ${doneSummaries.join(",")}`);
  assert(failedSummaries.join(",") === "BROKEN.json,REQ-TWO.json", `Unexpected failed summaries: ${failedSummaries.join(",")}`);

  const recoveredSummary = loadSummary(path.join(paths.doneRequestsDirectory, "REQ-RECOVERED.json"));
  const brokenSummary = loadSummary(path.join(paths.failedRequestsDirectory, "BROKEN.json"));
  const failedRequestSummary = loadSummary(path.join(paths.failedRequestsDirectory, "REQ-TWO.json"));

  assert(recoveredSummary.state === "done", "Recovered processing request should land in done");
  assert(recoveredSummary.requestID === "REQ-RECOVERED", "Recovered request summary should preserve request id");
  assert(brokenSummary.state === "failed", "Broken request should land in failed");
  assert(/Invalid request shape|Unexpected token|Expected property name/.test(brokenSummary.error || ""), "Broken request summary should capture parse error");
  assert(failedRequestSummary.state === "failed", "Handler failure should land in failed");
  assert((failedRequestSummary.error || "").includes("simulated-dispatch-failure"), "Failed handler summary should capture execution error");
  assert(logs.some((entry) => entry.subsystem === "electron-queue" && entry.message.includes("Processing request requestID=REQ-RECOVERED")), "Queue logs should include recovered processing request");

  console.log("Request queue validation OK (incoming, processing recovery, parse failure, execution failure)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
