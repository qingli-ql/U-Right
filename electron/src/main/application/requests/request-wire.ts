import type {
  ActionRequest,
  FinderActionContext,
  FileMetadata,
  FinderContextCapabilities,
  ToolAvailability,
  ToolKind
} from "../../../contracts/contracts";

export interface FileMetadataWire {
  url: string;
  isDirectory: boolean;
  fileSize?: number | null;
  uti?: string | null;
  fileExtension: string;
  isScriptLike: boolean;
}

export interface ToolAvailabilityWire {
  kind: string;
  isInstalled: boolean;
  executablePath?: string | null;
  appPath?: string | null;
}

export interface FinderActionContextCapabilitiesWire {
  hasWorkingDirectory: boolean;
  hasWritableTarget: boolean;
  scriptNames: string[];
}

export interface FinderActionContextWire {
  selectedURLs: string[];
  primaryURL?: string | null;
  currentDirectoryURL?: string | null;
  resolvedTargetDirectory?: string | null;
  resolvedPrimaryTarget?: string | null;
  resolvedSelectionDirectory?: string | null;
  selectionKind: FinderActionContext["selectionKind"];
  detectedTools: Record<string, ToolAvailabilityWire>;
  fileMetadata: FileMetadataWire[];
  extensionWindowTitle?: string | null;
  capabilities?: FinderActionContextCapabilitiesWire | null;
}

export interface ActionRequestWire {
  id: string;
  actionID: string;
  context: FinderActionContextWire;
  createdAt: string;
}

function expectRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function expectBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
}

function expectOptionalString(value: unknown, field: string): string | null | undefined {
  if (value == null) {
    return value as null | undefined;
  }
  return expectString(value, field);
}

function expectPathString(value: unknown, field: string): string {
  const pathValue = expectString(value, field);
  if (pathValue.startsWith("file://")) {
    throw new Error(`${field} must be a POSIX path string, not file URL`);
  }
  if (!pathValue.startsWith("/")) {
    throw new Error(`${field} must be an absolute POSIX path`);
  }
  return pathValue;
}

function expectOptionalPathString(value: unknown, field: string): string | null | undefined {
  if (value == null) {
    return value as null | undefined;
  }
  return expectPathString(value, field);
}

function expectStringArray(value: unknown, field: string, parser: (item: unknown, field: string) => string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }
  return value.map((item, index) => parser(item, `${field}[${index}]`));
}

function expectISODateString(value: unknown, field: string): string {
  const raw = expectString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(raw)) {
    throw new Error(`${field} must be an ISO 8601 UTC string`);
  }
  return raw;
}

function decodeCapabilities(value: unknown, field: string): FinderContextCapabilities | undefined {
  if (value == null) {
    return undefined;
  }
  const record = expectRecord(value, field);
  return {
    hasWorkingDirectory: expectBoolean(record.hasWorkingDirectory, `${field}.hasWorkingDirectory`),
    hasWritableTarget: expectBoolean(record.hasWritableTarget, `${field}.hasWritableTarget`),
    scriptNames: expectStringArray(record.scriptNames ?? [], `${field}.scriptNames`, expectString)
  };
}

function decodeDetectedTools(value: unknown, field: string): Partial<Record<ToolKind, ToolAvailability>> {
  const record = expectRecord(value, field);
  const detectedTools: Partial<Record<ToolKind, ToolAvailability>> = {};
  for (const [key, rawAvailability] of Object.entries(record)) {
    const availability = expectRecord(rawAvailability, `${field}.${key}`);
    const kind = expectString(availability.kind, `${field}.${key}.kind`);
    if (kind !== key) {
      throw new Error(`${field}.${key}.kind must match object key`);
    }
    detectedTools[key as ToolKind] = {
      kind: key as ToolKind,
      isInstalled: expectBoolean(availability.isInstalled, `${field}.${key}.isInstalled`),
      executablePath: expectOptionalString(availability.executablePath, `${field}.${key}.executablePath`) ?? undefined,
      appPath: expectOptionalString(availability.appPath, `${field}.${key}.appPath`) ?? undefined
    };
  }
  return detectedTools;
}

function decodeFileMetadata(value: unknown, field: string): FileMetadata[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }
  return value.map((item, index) => {
    const record = expectRecord(item, `${field}[${index}]`);
    const fileSize = record.fileSize;
    if (fileSize != null && typeof fileSize !== "number") {
      throw new Error(`${field}[${index}].fileSize must be a number or null`);
    }
    const uti = record.uti;
    if (uti != null && typeof uti !== "string") {
      throw new Error(`${field}[${index}].uti must be a string or null`);
    }
    return {
      url: expectPathString(record.url, `${field}[${index}].url`),
      isDirectory: expectBoolean(record.isDirectory, `${field}[${index}].isDirectory`),
      fileSize: typeof fileSize === "number" ? fileSize : null,
      uti: typeof uti === "string" ? uti : null,
      fileExtension: expectString(record.fileExtension, `${field}[${index}].fileExtension`),
      isScriptLike: expectBoolean(record.isScriptLike, `${field}[${index}].isScriptLike`)
    };
  });
}

export function decodeActionRequestWire(value: unknown): ActionRequest {
  const record = expectRecord(value, "ActionRequestWire");
  const contextRecord = expectRecord(record.context, "ActionRequestWire.context");
  return {
    id: expectString(record.id, "ActionRequestWire.id"),
    actionID: expectString(record.actionID, "ActionRequestWire.actionID"),
    createdAt: expectISODateString(record.createdAt, "ActionRequestWire.createdAt"),
    context: {
      selectedURLs: expectStringArray(contextRecord.selectedURLs, "ActionRequestWire.context.selectedURLs", expectPathString),
      primaryURL: expectOptionalPathString(contextRecord.primaryURL, "ActionRequestWire.context.primaryURL") ?? null,
      currentDirectoryURL: expectOptionalPathString(contextRecord.currentDirectoryURL, "ActionRequestWire.context.currentDirectoryURL") ?? null,
      resolvedTargetDirectory: expectOptionalPathString(contextRecord.resolvedTargetDirectory, "ActionRequestWire.context.resolvedTargetDirectory") ?? null,
      resolvedPrimaryTarget: expectOptionalPathString(contextRecord.resolvedPrimaryTarget, "ActionRequestWire.context.resolvedPrimaryTarget") ?? null,
      resolvedSelectionDirectory: expectOptionalPathString(contextRecord.resolvedSelectionDirectory, "ActionRequestWire.context.resolvedSelectionDirectory") ?? null,
      selectionKind: expectString(contextRecord.selectionKind, "ActionRequestWire.context.selectionKind") as FinderActionContext["selectionKind"],
      detectedTools: decodeDetectedTools(contextRecord.detectedTools ?? {}, "ActionRequestWire.context.detectedTools"),
      fileMetadata: decodeFileMetadata(contextRecord.fileMetadata ?? [], "ActionRequestWire.context.fileMetadata"),
      extensionWindowTitle: expectOptionalString(contextRecord.extensionWindowTitle, "ActionRequestWire.context.extensionWindowTitle") ?? null,
      capabilities: decodeCapabilities(contextRecord.capabilities, "ActionRequestWire.context.capabilities")
    }
  };
}

export function encodeActionRequestWire(request: ActionRequest): ActionRequestWire {
  return {
    id: request.id,
    actionID: request.actionID,
    createdAt: request.createdAt,
    context: {
      selectedURLs: request.context.selectedURLs,
      primaryURL: request.context.primaryURL ?? null,
      currentDirectoryURL: request.context.currentDirectoryURL ?? null,
      resolvedTargetDirectory: request.context.resolvedTargetDirectory ?? null,
      resolvedPrimaryTarget: request.context.resolvedPrimaryTarget ?? null,
      resolvedSelectionDirectory: request.context.resolvedSelectionDirectory ?? null,
      selectionKind: request.context.selectionKind,
      detectedTools: Object.fromEntries(
        Object.entries(request.context.detectedTools).map(([key, availability]) => [
          key,
          {
            kind: availability.kind,
            isInstalled: availability.isInstalled,
            executablePath: availability.executablePath ?? null,
            appPath: availability.appPath ?? null
          }
        ])
      ),
      fileMetadata: request.context.fileMetadata.map((item) => ({
        url: item.url,
        isDirectory: item.isDirectory,
        fileSize: item.fileSize ?? null,
        uti: item.uti ?? null,
        fileExtension: item.fileExtension,
        isScriptLike: item.isScriptLike
      })),
      extensionWindowTitle: request.context.extensionWindowTitle ?? null,
      capabilities: request.context.capabilities
        ? {
            hasWorkingDirectory: request.context.capabilities.hasWorkingDirectory,
            hasWritableTarget: request.context.capabilities.hasWritableTarget,
            scriptNames: request.context.capabilities.scriptNames ?? []
          }
        : null
    }
  };
}
