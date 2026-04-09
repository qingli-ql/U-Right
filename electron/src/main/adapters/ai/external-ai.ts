import { app, clipboard } from "electron";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { detectTools } from "../tools/tool-detection";

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function launchInteractiveAITool(tool: "claude" | "codex", prompt: string, workingDirectory?: string | null) {
  const toolInfo = detectTools()[tool];
  const executablePath = toolInfo?.executablePath;
  if (!executablePath) {
    throw new Error(`${tool} CLI is not available.`);
  }

  clipboard.writeText(prompt);
  const cwd = workingDirectory && fs.existsSync(workingDirectory) ? workingDirectory : app.getPath("home");
  const command = [
    `cd ${shellQuote(cwd)}`,
    "clear",
    `printf '%s\\n\\n' ${shellQuote(`U-Right copied the prepared prompt to your clipboard. Paste it into ${tool} if needed.`)}`,
    shellQuote(executablePath)
  ].join("; ");
  const script = `tell application "Terminal"
activate
do script ${JSON.stringify(command)}
end tell`;
  spawn("/usr/bin/osascript", ["-e", script], { detached: true, stdio: "ignore" }).unref();
}
