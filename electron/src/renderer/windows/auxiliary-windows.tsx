import { useDeferredValue, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { PromptWindowPayload, ResultWindowPayload } from "../../contracts/contracts";
import type { LogEntry } from "../../main/types";
import { getUrightAPI, Shell, StatusPill } from "../chrome";

export function PromptView({ payload }: { payload: PromptWindowPayload }) {
  const api = getUrightAPI();
  const [value, setValue] = useState(payload.defaultValue);
  const [selectedOption, setSelectedOption] = useState(payload.defaultSelectOption ?? payload.selectOptions?.[0] ?? "");
  const isCompact = payload.variant === "compact" && payload.mode === "singleline";
  const isNewFilePrompt = payload.kind === "new-file";

  function submit(nextValue: string | null) {
    void api.submitPrompt(nextValue);
  }

  function buildSubmitValue(rawValue: string): string {
    if (!isNewFilePrompt) {
      return rawValue;
    }
    const parsed = (() => {
      try {
        return JSON.parse(rawValue) as Partial<{ fileName: string; templateID: string; body: string }>;
      } catch {
        return { fileName: rawValue, templateID: "empty", body: "" } as Partial<{ fileName: string; templateID: string; body: string }>;
      }
    })();
    const [templateID] = (selectedOption || "empty").split("|");
    return JSON.stringify({
      fileName: (parsed.fileName ?? "").trim(),
      templateID: templateID || "empty",
      body: parsed.body ?? ""
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit(buildSubmitValue(value));
      return;
    }
    if (payload.mode === "singleline" && event.key === "Enter") {
      event.preventDefault();
      submit(buildSubmitValue(value));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      submit(null);
    }
  }

  if (isCompact) {
    return (
      <div className="compact-prompt-shell">
        <div className="compact-prompt-card">
          <p className="compact-prompt-kicker">{payload.title}</p>
          <h1>{payload.message}</h1>
          <input
            autoFocus
            className="compact-prompt-input"
            value={value}
            placeholder={payload.placeholder}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="compact-prompt-actions">
            <button className="secondary-button" onClick={() => submit(null)}>Cancel</button>
            <button className="primary-button" onClick={() => submit(value)}>{payload.submitLabel}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Shell chromeTitle={payload.title} chromeMeta={payload.mode === "multiline" ? "Prompt Composer" : "Confirmation Path"}>
      <div className="window prompt-window">
        <p className="eyebrow">{payload.mode === "multiline" ? "Prompt Composer" : "Confirmation Path"}</p>
        <h2>{payload.title}</h2>
        <p className="lede">{payload.message}</p>
        {isNewFilePrompt && payload.selectOptions?.length ? (
          <label>
            File type
            <select value={selectedOption} onChange={(event) => setSelectedOption(event.target.value)}>
              {payload.selectOptions.map((option) => {
                const [id, label] = option.split("|");
                return <option key={option} value={option}>{label || id}</option>;
              })}
            </select>
          </label>
        ) : null}
        {payload.mode === "multiline" ? (
          <textarea className="prompt-area" value={value} placeholder={payload.placeholder} onChange={(event) => setValue(event.target.value)} onKeyDown={onKeyDown} rows={18} />
        ) : (
          <input className="prompt-input" value={value} placeholder={payload.placeholder} onChange={(event) => setValue(event.target.value)} onKeyDown={onKeyDown} />
        )}
        <div className="footer-bar">
          <button className="secondary-button" onClick={() => submit(null)}>Cancel</button>
          <button className="primary-button" onClick={() => submit(buildSubmitValue(value))}>{payload.submitLabel}</button>
        </div>
      </div>
    </Shell>
  );
}

export function ResultView({ payload }: { payload: ResultWindowPayload }) {
  const api = getUrightAPI();
  const [markdown, setMarkdown] = useState(payload.markdown);
  const [currentPayload, setCurrentPayload] = useState(payload);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");

  useEffect(() => {
    api.onResultAppend((chunk) => {
      setMarkdown((current) => current + chunk);
    });
  }, [api]);

  useEffect(() => {
    api.onResultPayload((nextPayload) => {
      setCurrentPayload(nextPayload);
    });
  }, [api]);

  const statusTone = currentPayload.status === "failed" ? "warn" : currentPayload.status === "completed" ? "good" : "muted";
  const statusLabel = currentPayload.status === "failed"
    ? "Run failed"
    : currentPayload.status === "completed"
      ? "Run complete"
      : "Running";
  const canEscalate = currentPayload.kind === "ai" && Boolean(currentPayload.externalTool && currentPayload.externalPrompt);

  async function handleCopyPreparedPrompt() {
    if (!currentPayload.externalPrompt) {
      return;
    }
    await api.copyText(currentPayload.externalPrompt);
    setCopyState("done");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <Shell chromeTitle={currentPayload.title} chromeMeta={currentPayload.kind === "ai" ? "AI Result" : "Result"}>
      <div className="window result-window">
        <div className="hero compact">
          <div>
            <p className="eyebrow">{currentPayload.kind === "ai" ? "AI Result" : "Result"}</p>
            <h2>{currentPayload.title}</h2>
            {currentPayload.providerLabel || currentPayload.contextLabel ? (
              <p className="lede">
                {[currentPayload.providerLabel, currentPayload.contextLabel].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="status-grid compact">
            <StatusPill label={statusLabel} tone={statusTone} />
            <StatusPill label={currentPayload.canApplyToFile ? "Apply enabled" : "Read only"} tone={currentPayload.canApplyToFile ? "good" : "muted"} />
          </div>
        </div>
        <article className="markdown-body">
          <ReactMarkdown>{markdown || (currentPayload.status === "running" ? "_Waiting for output..._" : "_No output produced._")}</ReactMarkdown>
        </article>
        <div className="footer-bar">
          <button className="secondary-button" onClick={() => void api.saveResult(markdown, currentPayload.suggestedFilePath ?? undefined)}>Save</button>
          <button className="secondary-button" disabled={!currentPayload.suggestedFilePath} onClick={() => void api.openInEditor(currentPayload.suggestedFilePath)}>Open in Editor</button>
          {canEscalate ? (
            <button className="secondary-button" onClick={() => void handleCopyPreparedPrompt()}>
              {copyState === "done" ? "Prompt Copied" : "Copy Prompt"}
            </button>
          ) : null}
          {canEscalate ? (
            <button
              className="secondary-button"
              onClick={() => void api.continueAIInExternal(currentPayload.externalTool!, currentPayload.externalPrompt!, currentPayload.workingDirectory)}
            >
              Continue in {currentPayload.providerLabel}
            </button>
          ) : null}
          <button className="primary-button" disabled={!currentPayload.canApplyToFile} onClick={() => void api.applyResult(markdown, currentPayload.suggestedFilePath)}>Apply to File</button>
        </div>
      </div>
    </Shell>
  );
}

export function LogsView() {
  const api = getUrightAPI();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "INFO" | "ERROR">("ALL");
  const [subsystemFilter, setSubsystemFilter] = useState("all");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const nextLogs = await api.loadLogs();
      if (!cancelled) {
        setLogs(nextLogs);
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 700);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api]);

  const orderedLogs = useMemo(() => logs.slice().reverse(), [logs]);
  const subsystemOptions = useMemo(
    () => Array.from(new Set(logs.map((entry) => entry.subsystem))).sort(),
    [logs]
  );
  const errorCount = useMemo(
    () => logs.filter((entry) => entry.level.toUpperCase() === "ERROR").length,
    [logs]
  );
  const visibleLogs = useMemo(() => {
    const needle = deferredSearchQuery.trim().toLowerCase();
    return orderedLogs.filter((entry) => {
      if (levelFilter !== "ALL" && entry.level.toUpperCase() !== levelFilter) {
        return false;
      }
      if (subsystemFilter !== "all" && entry.subsystem !== subsystemFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return `${entry.subsystem} ${entry.level} ${entry.message} ${entry.timestamp}`.toLowerCase().includes(needle);
    });
  }, [deferredSearchQuery, levelFilter, orderedLogs, subsystemFilter]);
  const latestTimestamp = orderedLogs[0]?.timestamp ?? null;

  function formatLogTimestamp(timestamp: string) {
    if (!timestamp) return "-";
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return timestamp;
    return parsed.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  async function handleClearLogs() {
    setIsClearing(true);
    try {
      const nextLogs = await api.clearLogs();
      setLogs(nextLogs);
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <Shell chromeTitle="Logs & Visibility" chromeMeta="Structured Logs">
      <div className="window logs-window">
        <div className="logs-scroll-region">
          <div className="hero compact">
            <div>
              <p className="eyebrow">Structured Logs</p>
              <h2>Host + Finder bridge visibility</h2>
              <p className="muted logs-intro">把 Finder extension、Electron host、action 执行链路放进同一条事件流里，优先看异常，再看细节。</p>
            </div>
            <div className="footer-actions">
              <div className="footer-badge">{logs.length} entries</div>
              <button className="secondary-button" disabled={isClearing} onClick={() => void handleClearLogs()}>
                {isClearing ? "Clearing..." : "Clear Logs"}
              </button>
            </div>
          </div>
          <div className="logs-overview-grid">
            <article className="logs-overview-card">
              <span>Total stream</span>
              <strong>{logs.length}</strong>
              <small>全部结构化事件</small>
            </article>
            <article className="logs-overview-card">
              <span>Error pressure</span>
              <strong>{errorCount}</strong>
              <small>{errorCount > 0 ? "优先处理错误事件" : "当前没有错误事件"}</small>
            </article>
            <article className="logs-overview-card">
              <span>Subsystems</span>
              <strong>{subsystemOptions.length}</strong>
              <small>{subsystemOptions.slice(0, 3).join(" · ") || "No subsystem data"}</small>
            </article>
            <article className="logs-overview-card">
              <span>Latest signal</span>
              <strong>{formatLogTimestamp(latestTimestamp ?? "")}</strong>
              <small>{latestTimestamp ? "最近一条写入事件" : "尚未写入日志"}</small>
            </article>
          </div>
          <div className="logs-toolbar">
            <div className="logs-filter-pills">
              {[
                { id: "ALL", label: "All" },
                { id: "INFO", label: "Info" },
                { id: "ERROR", label: "Errors" }
              ].map((item) => (
                <button
                  key={item.id}
                  className={`segmented-button ${levelFilter === item.id ? "active" : ""}`}
                  onClick={() => setLevelFilter(item.id as "ALL" | "INFO" | "ERROR")}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="logs-select-field">
              <span>Subsystem</span>
              <select value={subsystemFilter} onChange={(event) => setSubsystemFilter(event.target.value)}>
                <option value="all">All subsystems</option>
                {subsystemOptions.map((subsystem) => (
                  <option key={subsystem} value={subsystem}>{subsystem}</option>
                ))}
              </select>
            </label>
            <label className="logs-search-field">
              <span>Search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="requestID, action, subsystem, path..."
              />
            </label>
          </div>
          <div className="log-list">
            {visibleLogs.length === 0 && (
              <div className="logs-empty-state">
                <p>No logs match the current filters.</p>
                <span>试试清空筛选，或者先在 Finder 里触发一次菜单动作。</span>
              </div>
            )}
            {visibleLogs.map((entry, index) => (
              <div key={entry.id} className={`log-entry log-entry-${entry.level.toLowerCase()}`}>
                <div className="log-entry-rail">
                  <span className={`log-level-badge log-level-${entry.level.toLowerCase()}`}>{entry.level}</span>
                  <strong className="log-subsystem">{entry.subsystem}</strong>
                  <time dateTime={entry.timestamp || undefined}>{formatLogTimestamp(entry.timestamp)}</time>
                  <small>#{String(visibleLogs.length - index).padStart(3, "0")}</small>
                </div>
                <div className="log-entry-body">
                  <div className="log-entry-headerline">
                    <span className="log-entry-label">Event payload</span>
                    <span className="log-entry-rawtime">{entry.timestamp || "-"}</span>
                  </div>
                  <p>{entry.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function OnboardingView() {
  return (
    <Shell chromeTitle="Finder + Host Setup" chromeMeta="Checklist-first Setup">
      <div className="window onboarding-window">
        <div className="onboarding-scroll-region">
          <p className="eyebrow">Checklist-first setup</p>
          <h2>Make Finder + Electron work together</h2>
          <div className="checklist">
            {[
              "Build or install U-Right.app",
              "Launch the Electron host or native bridge",
              "Enable the Finder extension in System Settings",
              "Configure Claude, Codex, and editor paths in Settings",
              "Verify file, folder, multi-select, and empty-space contexts"
            ].map((item) => (
              <div key={item} className="check-item">
                <span>•</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
