import { app, dialog } from "electron";
import { spawn } from "node:child_process";
import type { ActionHandler } from "../command-types";
import { createDirectActionCommand } from "../action-executor";
import { directoryPath, primaryPath, promptForValue, summarizeContext } from "../command-helpers";
import { detectTools } from "../../../adapters/tools/tool-detection";
import { saveSettings } from "../../settings/settings-repository";

function aiProviderLabel(actionID: string): string {
  return actionID === "ai.ask-codex" ? "Codex" : "Claude";
}

function composeAIExecutionPrompt(options: {
  systemPromptTemplate: string;
  contextSummary: string;
  userIntent: string;
}) {
  return [
    options.systemPromptTemplate.trim(),
    "Context:",
    options.contextSummary.trim(),
    "User request:",
    options.userIntent.trim()
  ].filter(Boolean).join("\n\n");
}

function initialAIResultMarkdown(options: {
  providerLabel: string;
  contextSummary: string;
  userIntent: string;
}) {
  return [
    `> Running ${options.providerLabel} from U-Right`,
    "",
    `**Request**`,
    options.userIntent,
    "",
    `**Finder context**`,
    options.contextSummary
  ].join("\n");
}

async function runAIAction(ctx: Parameters<ActionHandler>[0]): Promise<boolean> {
  if (!ctx.settings.ai.enabled) {
    await dialog.showMessageBox({ type: "error", title: "U-Right", message: "AI 功能已在设置中禁用。" });
    return true;
  }

  const activePolicy = ctx.settings.ai.promptPolicies.find((item) => item.id === ctx.settings.ai.defaultPromptPolicyID)
    ?? ctx.settings.ai.promptPolicies[0];
  const providerLabel = aiProviderLabel(ctx.request.actionID);
  const title = ctx.request.actionID === "ai.ask-codex" ? "Ask Codex About This" : "Ask Claude About This";
  const contextSummary = summarizeContext(ctx.request.context);
  const userIntent = await promptForValue(ctx.controller, {
    title,
    message: `补充你想让 ${providerLabel} 完成的事情。当前 Finder 上下文会自动附带，不需要重复描述。`,
    defaultValue: "",
    mode: "multiline",
    submitLabel: "Run",
    placeholder: "例如：解释这个文件做什么；给出 README 草稿；只关注错误原因。",
    kind: "ai-request"
  });
  if (!userIntent) return true;

  const composedPrompt = composeAIExecutionPrompt({
    systemPromptTemplate: activePolicy?.systemPromptTemplate ?? "",
    contextSummary,
    userIntent
  });

  saveSettings({
    ...ctx.settings,
    lastAIActionID: ctx.request.actionID,
    recentActionIDs: [ctx.request.actionID, ...ctx.settings.recentActionIDs.filter((id) => id !== ctx.request.actionID)].slice(0, 12)
  });

  const resultWindow = ctx.controller.openResult({
    title,
    markdown: initialAIResultMarkdown({
      providerLabel,
      contextSummary,
      userIntent
    }),
    canApplyToFile: ctx.request.context.selectionKind === "file" && Boolean(ctx.request.context.primaryURL),
    suggestedFilePath: primaryPath(ctx.request.context),
    workingDirectory: directoryPath(ctx.request.context) ?? primaryPath(ctx.request.context),
    kind: "ai",
    status: "running",
    providerLabel,
    externalTool: ctx.request.actionID === "ai.ask-codex" ? "codex" : "claude",
    externalPrompt: composedPrompt,
    contextLabel: contextSummary
  });

  const tools = detectTools();
  const binary = ctx.request.actionID === "ai.ask-codex" ? tools.codex?.executablePath : tools.claude?.executablePath;
  if (!binary) {
    ctx.controller.appendResult(resultWindow, "CLI 不可用，请先安装 Claude/Codex CLI。");
    ctx.controller.updateResult(resultWindow, { status: "failed" });
    return true;
  }

  const args = ctx.request.actionID === "ai.ask-codex" ? ["exec", composedPrompt] : ["--print", composedPrompt];
  const child = spawn(binary, args, { cwd: directoryPath(ctx.request.context) ?? app.getPath("home") });
  child.stdout.on("data", (chunk) => ctx.controller.appendResult(resultWindow, String(chunk)));
  child.stderr.on("data", (chunk) => ctx.controller.appendResult(resultWindow, `\n[stderr]\n${String(chunk)}`));
  child.on("error", (error) => {
    ctx.controller.appendResult(resultWindow, `\n[error]\n${error.message}`);
    ctx.controller.updateResult(resultWindow, { status: "failed" });
  });
  child.on("close", (code) => {
    ctx.controller.updateResult(resultWindow, {
      status: code === 0 ? "completed" : "failed"
    });
    if (code && code !== 0) {
      ctx.controller.appendResult(resultWindow, `\n[exit]\nProcess exited with code ${code}.`);
    }
  });
  return true;
}

export const AI_HANDLERS: Record<string, ActionHandler> = {
  "ai.ask-claude": runAIAction,
  "ai.ask-codex": runAIAction
};

export const AI_ACTION_COMMANDS = [
  createDirectActionCommand("ai.ask-claude", runAIAction),
  createDirectActionCommand("ai.ask-codex", runAIAction)
];
