import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { AppSettings, PromptWindowPayload, ResultWindowPayload, WindowContextPayload } from "../shared/contracts";
import { ACTION_CATEGORY_META, KNOWN_ACTIONS, TOOL_ORDER, createDefaultSettings } from "../shared/defaults";
import type { LogEntry } from "../main/types";

function getUrightAPI() {
  if (typeof window === "undefined" || !window.uright) {
    throw new Error("Electron preload bridge is unavailable. Check BrowserWindow preload/contextIsolation configuration.");
  }
  return window.uright;
}

function formatActionTitle(actionID: string) {
  const known = KNOWN_ACTIONS.find((item) => item.id === actionID);
  if (known) return known.title;
  return actionID
    .split(".")
    .slice(-1)[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span className="logo-mark-u">U</span>
      <span className="logo-mark-slash" />
      <span className="logo-mark-r">R</span>
    </div>
  );
}

function Shell({
  children,
  chromeTitle,
  chromeMeta
}: {
  children: React.ReactNode;
  chromeTitle: string;
  chromeMeta: string;
}) {
  return (
    <div className="shell">
      <div className="atmosphere atmosphere-left" />
      <div className="atmosphere atmosphere-right" />
      <div className="grain" />
      <div className="chrome-bar">
        <div className="chrome-brand">
          <LogoMark />
          <div className="chrome-copy">
            <p>{chromeMeta}</p>
            <strong>{chromeTitle}</strong>
          </div>
        </div>
        <div className="chrome-chip">macOS Finder Companion</div>
      </div>
      {children}
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "good" | "muted" | "warn" }) {
  return <div className={`status-pill ${tone}`}>{label}</div>;
}

function SettingsView() {
  const api = getUrightAPI();
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings());
  const [tools, setTools] = useState<Record<string, { isInstalled: boolean; executablePath?: string; appPath?: string }>>({});
  const [section, setSection] = useState("context-menu");
  const [selectedCategory, setSelectedCategory] = useState<string>("create");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    void Promise.all([api.loadSettings(), api.detectTools()]).then(([loaded, detected]) => {
      setSettings(loaded);
      setTools(detected);
      setSelectedCategory(loaded.contextMenu.categorySettings[0]?.category ?? "create");
    });
  }, [api]);

  const categories = settings.contextMenu.categorySettings.slice().sort((left, right) => left.order - right.order);
  const categoryActions = settings.contextMenu.actionSettings.filter((item) => {
    const known = KNOWN_ACTIONS.find((action) => action.id === item.actionID);
    return (item.categoryOverride ?? known?.category) === selectedCategory;
  });

  const statusSummary = useMemo(() => {
    const values = Object.values(tools);
    return {
      installedEditors: values.filter((item) => item.isInstalled).length,
      hasClaude: Boolean(tools.claude?.isInstalled),
      hasCodex: Boolean(tools.codex?.isInstalled)
    };
  }, [tools]);

  async function save() {
    const saved = await api.saveSettings(settings);
    setSettings(saved);
    setSavedMessage("已保存到共享 JSON");
    setTimeout(() => setSavedMessage(""), 2500);
  }

  async function chooseTemplateFolder() {
    const selected = await api.chooseDirectory();
    if (selected) {
      setSettings({ ...settings, customTemplateFolder: selected });
    }
  }

  return (
    <Shell chromeTitle="Settings Studio" chromeMeta="U-Right Host">
      <div className="window settings-window">
        <aside className="sidebar">
          <div>
            <p className="eyebrow">U-Right Host</p>
            <h1>System-grade Finder utility</h1>
          </div>
          <nav className="nav-list">
            {[
              ["general", "General"],
              ["context-menu", "Context Menu"],
              ["tools", "Tools"],
              ["ai", "AI"],
              ["templates", "Templates"],
              ["advanced", "Advanced"]
            ].map(([key, title]) => (
              <button key={key} className={section === key ? "nav-button active" : "nav-button"} onClick={() => setSection(key)}>
                {title}
              </button>
            ))}
          </nav>
        </aside>
        <main className="content">
          <header className="hero">
            <div>
              <p className="eyebrow">Professional Utility Direction</p>
              <h2>Electron host for settings, prompts, results, and logs</h2>
              <p className="lede">共享配置已经切到 JSON；这里的设置会直接影响 Finder 扩展和后续 Electron 动作执行。</p>
            </div>
            <div className="status-grid">
              <StatusPill label={settings.showExtensionStatus ? "Extension visible" : "Extension hidden"} tone={settings.showExtensionStatus ? "good" : "muted"} />
              <StatusPill label={statusSummary.hasClaude ? "Claude ready" : "Claude missing"} tone={statusSummary.hasClaude ? "good" : "warn"} />
              <StatusPill label={statusSummary.hasCodex ? "Codex ready" : "Codex missing"} tone={statusSummary.hasCodex ? "good" : "warn"} />
              <StatusPill label={`${statusSummary.installedEditors} tools detected`} tone="muted" />
            </div>
          </header>

          {section === "general" && (
            <section className="panel-grid two">
              <section className="panel">
                <h3>General</h3>
                <label className="switch-row"><span>Launch at login</span><input type="checkbox" checked={settings.launchAtLogin} onChange={(event) => setSettings({ ...settings, launchAtLogin: event.target.checked })} /></label>
                <label className="switch-row"><span>Show menu bar icon</span><input type="checkbox" checked={settings.showMenuBarIcon} onChange={(event) => setSettings({ ...settings, showMenuBarIcon: event.target.checked })} /></label>
                <label className="switch-row"><span>Show extension status</span><input type="checkbox" checked={settings.showExtensionStatus} onChange={(event) => setSettings({ ...settings, showExtensionStatus: event.target.checked })} /></label>
              </section>
              <section className="panel">
                <h3>Defaults</h3>
                <label>Default Terminal
                  <select value={settings.defaultTerminal} onChange={(event) => setSettings({ ...settings, defaultTerminal: event.target.value as AppSettings["defaultTerminal"] })}>
                    {TOOL_ORDER.slice(0, 3).map((tool) => <option key={tool} value={tool}>{tool}</option>)}
                  </select>
                </label>
                <label>Default Editor
                  <select value={settings.defaultEditor} onChange={(event) => setSettings({ ...settings, defaultEditor: event.target.value as AppSettings["defaultEditor"] })}>
                    {["vscode", "cursor", "zed"].map((tool) => <option key={tool} value={tool}>{tool}</option>)}
                  </select>
                </label>
              </section>
            </section>
          )}

          {section === "context-menu" && (
            <section className="panel-grid three">
              <section className="panel">
                <h3>Categories</h3>
                <div className="list">
                  {categories.map((category) => (
                    <button
                      key={category.category}
                      className={selectedCategory === category.category ? "list-item active-card" : "list-item active-buttonless"}
                      onClick={() => setSelectedCategory(category.category)}
                    >
                      <div>
                        <strong>{ACTION_CATEGORY_META.find((item) => item.category === category.category)?.title ?? category.category}</strong>
                        <p>{category.displayStyle} · order {category.order}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={category.isEnabled}
                        onChange={(event) => setSettings({
                          ...settings,
                          contextMenu: {
                            ...settings.contextMenu,
                            categorySettings: settings.contextMenu.categorySettings.map((item) => item.category === category.category ? { ...item, isEnabled: event.target.checked } : item)
                          }
                        })}
                      />
                    </button>
                  ))}
                </div>
              </section>
              <section className="panel">
                <h3>Actions</h3>
                <div className="list">
                  {categoryActions.map((action) => (
                    <div key={action.actionID} className="list-item">
                      <div>
                        <strong>{formatActionTitle(action.actionID)}</strong>
                        <p>{action.actionID}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={action.isEnabled}
                        onChange={(event) => setSettings({
                          ...settings,
                          contextMenu: {
                            ...settings.contextMenu,
                            actionSettings: settings.contextMenu.actionSettings.map((item) => item.actionID === action.actionID ? { ...item, isEnabled: event.target.checked } : item)
                          }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel preview-panel">
                <h3>Preview</h3>
                <div className="preview-box">
                  <p className="preview-label">Finder menu snapshot</p>
                  {categories.filter((category) => category.isEnabled).map((category) => (
                    <div key={category.category} className="preview-group">
                      <strong>{ACTION_CATEGORY_META.find((item) => item.category === category.category)?.title ?? category.category}</strong>
                      {settings.contextMenu.actionSettings
                        .filter((item) => item.isEnabled && (item.categoryOverride ?? KNOWN_ACTIONS.find((action) => action.id === item.actionID)?.category) === category.category)
                        .slice(0, 4)
                        .map((item) => <span key={item.actionID}>{formatActionTitle(item.actionID)}</span>)}
                    </div>
                  ))}
                </div>
              </section>
            </section>
          )}

          {section === "tools" && (
            <section className="panel">
              <h3>Tool Detection</h3>
              <div className="list">
                {TOOL_ORDER.map((tool) => (
                  <div key={tool} className="tool-row">
                    <div>
                      <strong>{tool}</strong>
                      <p>{tools[tool]?.executablePath ?? tools[tool]?.appPath ?? "Not detected"}</p>
                    </div>
                    <StatusPill label={tools[tool]?.isInstalled ? "Installed" : "Missing"} tone={tools[tool]?.isInstalled ? "good" : "warn"} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === "ai" && (
            <section className="panel-grid two">
              <section className="panel">
                <h3>AI Provider</h3>
                <label className="switch-row"><span>Enable AI actions</span><input type="checkbox" checked={settings.aiEnabled} onChange={(event) => setSettings({ ...settings, aiEnabled: event.target.checked })} /></label>
                <label>Preferred Provider
                  <select value={settings.preferredAIProvider} onChange={(event) => setSettings({ ...settings, preferredAIProvider: event.target.value as AppSettings["preferredAIProvider"] })}>
                    {["auto", "claudeCLI", "codexCLI", "openAICompatible"].map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                  </select>
                </label>
                <label>API Base URL<input value={settings.apiBaseURL} onChange={(event) => setSettings({ ...settings, apiBaseURL: event.target.value })} /></label>
                <label>API Key<input type="password" value={settings.apiKey} onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })} /></label>
                <label>API Model<input value={settings.apiModel} onChange={(event) => setSettings({ ...settings, apiModel: event.target.value })} /></label>
              </section>
              <section className="panel">
                <h3>Prompt Policy</h3>
                <label>System Prompt
                  <textarea value={settings.systemPromptTemplate} onChange={(event) => setSettings({ ...settings, systemPromptTemplate: event.target.value })} rows={10} />
                </label>
                <label>Max File Size<input type="number" value={settings.maxContextFileSize} onChange={(event) => setSettings({ ...settings, maxContextFileSize: Number(event.target.value) })} /></label>
                <label>Max Folder Depth<input type="number" value={settings.maxFolderScanDepth} onChange={(event) => setSettings({ ...settings, maxFolderScanDepth: Number(event.target.value) })} /></label>
              </section>
            </section>
          )}

          {section === "templates" && (
            <section className="panel">
              <h3>Templates</h3>
              <label>Custom Template Folder
                <div className="inline-actions">
                  <input value={settings.customTemplateFolder} onChange={(event) => setSettings({ ...settings, customTemplateFolder: event.target.value })} />
                  <button className="secondary-button" onClick={() => void chooseTemplateFolder()}>Choose…</button>
                </div>
              </label>
            </section>
          )}

          {section === "advanced" && (
            <section className="panel-grid two">
              <section className="panel">
                <h3>Advanced</h3>
                <label className="switch-row"><span>Include hidden files</span><input type="checkbox" checked={settings.includeHiddenFiles} onChange={(event) => setSettings({ ...settings, includeHiddenFiles: event.target.checked })} /></label>
                <label className="switch-row"><span>Debug logging</span><input type="checkbox" checked={settings.debugLogging} onChange={(event) => setSettings({ ...settings, debugLogging: event.target.checked })} /></label>
              </section>
              <section className="panel">
                <h3>Storage</h3>
                <p>运行时设置已经统一写入 App Group 共享 JSON，并带有自动备份回退。</p>
                <p className="muted">这让 Finder Extension 与 Electron Host 使用同一份配置，不再依赖独立的 UserDefaults 状态。</p>
              </section>
            </section>
          )}

          <footer className="footer-bar">
            <span>{savedMessage || "Ready for Finder-driven workflows."}</span>
            <button className="primary-button" onClick={() => void save()}>Save Shared Settings</button>
          </footer>
        </main>
      </div>
    </Shell>
  );
}

function PromptView({ payload }: { payload: PromptWindowPayload }) {
  const api = getUrightAPI();
  const [value, setValue] = useState(payload.defaultValue);
  return (
    <Shell chromeTitle={payload.title} chromeMeta={payload.mode === "multiline" ? "Prompt Composer" : "Confirmation Path"}>
      <div className="window prompt-window">
        <p className="eyebrow">{payload.mode === "multiline" ? "Prompt Composer" : "Confirmation Path"}</p>
        <h2>{payload.title}</h2>
        <p className="lede">{payload.message}</p>
        {payload.mode === "multiline" ? (
          <textarea className="prompt-area" value={value} onChange={(event) => setValue(event.target.value)} rows={18} />
        ) : (
          <input className="prompt-input" value={value} onChange={(event) => setValue(event.target.value)} />
        )}
        <div className="footer-bar">
          <button className="secondary-button" onClick={() => void api.submitPrompt(null)}>Cancel</button>
          <button className="primary-button" onClick={() => void api.submitPrompt(value)}>{payload.submitLabel}</button>
        </div>
      </div>
    </Shell>
  );
}

function ResultView({ payload }: { payload: ResultWindowPayload }) {
  const api = getUrightAPI();
  const [markdown, setMarkdown] = useState(payload.markdown);

  useEffect(() => {
    api.onResultAppend((chunk) => {
      setMarkdown((current) => current + chunk);
    });
  }, [api]);

  return (
    <Shell chromeTitle={payload.title} chromeMeta="AI Result">
      <div className="window result-window">
        <div className="hero compact">
          <div>
            <p className="eyebrow">AI Result</p>
            <h2>{payload.title}</h2>
          </div>
          <div className="status-grid compact">
            <StatusPill label={payload.canApplyToFile ? "Apply enabled" : "Read only"} tone={payload.canApplyToFile ? "good" : "muted"} />
          </div>
        </div>
        <article className="markdown-body">
          <ReactMarkdown>{markdown || "_Waiting for output..._"}</ReactMarkdown>
        </article>
        <div className="footer-bar">
          <button className="secondary-button" onClick={() => void api.saveResult(markdown, payload.suggestedFilePath ?? undefined)}>Save</button>
          <button className="secondary-button" onClick={() => void api.openInEditor(payload.suggestedFilePath)}>Open in Editor</button>
          <button className="primary-button" disabled={!payload.canApplyToFile} onClick={() => void api.applyResult(markdown, payload.suggestedFilePath)}>Apply to File</button>
        </div>
      </div>
    </Shell>
  );
}

function LogsView() {
  const api = getUrightAPI();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    void api.loadLogs().then(setLogs);
  }, [api]);
  return (
    <Shell chromeTitle="Logs & Visibility" chromeMeta="Structured Logs">
      <div className="window logs-window">
        <div className="hero compact">
          <div>
            <p className="eyebrow">Structured Logs</p>
            <h2>Host + Finder bridge visibility</h2>
          </div>
        </div>
        <div className="log-list">
          {logs.length === 0 && <p className="muted">No logs yet.</p>}
          {logs.map((entry) => (
            <div key={entry.id} className="log-entry">
              <span>{entry.level}</span>
              <strong>{entry.subsystem}</strong>
              <p>{entry.message}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function OnboardingView() {
  return (
    <Shell chromeTitle="Finder + Host Setup" chromeMeta="Checklist-first Setup">
      <div className="window onboarding-window">
        <p className="eyebrow">Checklist-first setup</p>
        <h2>Make Finder + Electron work together</h2>
        <div className="checklist">
          {[
            "构建或安装 U-Right.app",
            "启动 Electron Host 或原生 Host 过渡层",
            "在系统设置中启用 Finder Extension",
            "在 Settings 中配置 Claude / Codex / 编辑器路径",
            "右键文件、目录、多选、空白区域验证四种上下文"
          ].map((item) => (
            <div key={item} className="check-item">
              <span>•</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export default function App() {
  const [context, setContext] = useState<WindowContextPayload | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const api = getUrightAPI();
      void api.getWindowContext().then((nextContext) => {
        if (!nextContext) {
          setBridgeError("Electron 主进程没有返回窗口上下文，当前窗口无法判断应渲染哪种页面。");
          return;
        }
        setContext(nextContext);
      });
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  if (bridgeError) {
    return (
      <Shell chromeTitle="Bridge Required" chromeMeta="U-Right Runtime">
        <div className="window loading-window">
          <p>U-Right bridge unavailable</p>
          <p className="muted">{bridgeError}</p>
        </div>
      </Shell>
    );
  }

  if (!context) {
    return <Shell chromeTitle="Loading Workspace" chromeMeta="U-Right Runtime"><div className="window loading-window"><p>Loading U-Right…</p></div></Shell>;
  }

  switch (context.kind) {
    case "settings":
      return <SettingsView />;
    case "prompt":
      return <PromptView payload={context.prompt!} />;
    case "result":
      return <ResultView payload={context.result!} />;
    case "logs":
      return <LogsView />;
    case "onboarding":
      return <OnboardingView />;
    default:
      return null;
  }
}
