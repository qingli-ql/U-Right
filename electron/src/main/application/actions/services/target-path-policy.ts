import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FinderActionContext } from "../../../../contracts/contracts";

export function resolveLocalPath(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("file://")) {
    try {
      return fileURLToPath(value);
    } catch {
      return null;
    }
  }
  return value;
}

export function selectedPaths(context: FinderActionContext): string[] {
  return context.selectedURLs
    .map((value) => resolveLocalPath(value))
    .filter((value): value is string => Boolean(value));
}

export function resolvedTargetDirectory(context: FinderActionContext): string | null {
  return resolveLocalPath(context.resolvedTargetDirectory);
}

export function resolvedSelectionDirectory(context: FinderActionContext): string | null {
  return resolveLocalPath(context.resolvedSelectionDirectory);
}

export function primaryPath(context: FinderActionContext): string | null {
  return resolveLocalPath(context.resolvedPrimaryTarget) ?? resolveLocalPath(context.primaryURL);
}

export function singleTargetPath(context: FinderActionContext): string | null {
  const primary = primaryPath(context);
  if (primary) return primary;
  const selected = selectedPaths(context);
  return selected.length === 1 ? selected[0] : null;
}

export function directoryPath(context: FinderActionContext): string | null {
  const target = resolvedTargetDirectory(context);
  if (target) return target;
  const current = resolveLocalPath(context.currentDirectoryURL);
  if (current) return current;
  if (context.selectionKind === "folder") return primaryPath(context);
  const primary = primaryPath(context);
  return primary ? path.dirname(primary) : null;
}

export function viewDirectoryPath(context: FinderActionContext): string | null {
  return resolvedSelectionDirectory(context)
    ?? resolvedTargetDirectory(context)
    ?? directoryPath(context);
}

export function actionTargets(context: FinderActionContext): string[] {
  const selected = selectedPaths(context);
  if (selected.length > 0) return selected;
  const directory = directoryPath(context);
  return directory ? [directory] : [];
}

export function relativePath(base: string | null, target: string): string {
  if (!base) return target;
  const relative = path.relative(base, target);
  return relative.length > 0 ? relative : ".";
}
