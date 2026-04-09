import { app } from "electron";
import { spawn } from "node:child_process";
import type { WindowController } from "../../../desktop/windows/window-controller";

export function streamCommandToResult(
  controller: WindowController,
  options: {
    title: string;
    command: string;
    args: string[];
    cwd?: string | null;
    suggestedFilePath?: string | null;
  }
) {
  const resultWindow = controller.openResult({
    title: options.title,
    markdown: "",
    canApplyToFile: false,
    suggestedFilePath: options.suggestedFilePath ?? null,
    workingDirectory: options.cwd ?? null
  });
  const child = spawn(options.command, options.args, { cwd: options.cwd ?? app.getPath("home") });
  child.stdout.on("data", (chunk: Buffer) => controller.appendResult(resultWindow, String(chunk)));
  child.stderr.on("data", (chunk: Buffer) => controller.appendResult(resultWindow, `\n[stderr]\n${String(chunk)}`));
}
