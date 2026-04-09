import fs from "node:fs";
import path from "node:path";

export function sanitizeFileName(name: string): string {
  return name.replace(/[\/:\0]/g, "-").trim();
}

export function nextDuplicatePath(target: string): string {
  const directory = path.dirname(target);
  const parsed = path.parse(target);
  const stem = parsed.ext ? parsed.name : parsed.base;
  const extension = parsed.ext;
  let candidate = path.join(directory, `${stem} copy${extension}`);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${stem} copy ${index}${extension}`);
    index += 1;
  }
  return candidate;
}

export async function ensureWritableExistingTarget(target: string): Promise<boolean> {
  const writablePath = fs.existsSync(target) && fs.statSync(target).isDirectory()
    ? target
    : path.dirname(target);
  try {
    fs.accessSync(writablePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureWritableFile(target: string): Promise<boolean> {
  try {
    fs.accessSync(target, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
