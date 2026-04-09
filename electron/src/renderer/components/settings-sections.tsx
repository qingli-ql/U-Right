import type { AppSettings, UserTemplateItem } from "../../contracts/contracts";
import { StatusPill } from "../chrome";

type ToolRow = {
  tool: string;
  label: string;
  family: string;
  installType: string;
  path: string;
  isInstalled: boolean;
  allowMenuActions: boolean;
};

type StatusSummary = {
  hasClaude: boolean;
  hasCodex: boolean;
  installedTools: number;
};

export function GeneralSettingsSection({
  settings,
  updateGeneral,
  updateIntegrations
}: {
  settings: AppSettings;
  updateGeneral: (patch: Partial<AppSettings["general"]>) => void;
  updateIntegrations: (patch: Partial<AppSettings["integrations"]>) => void;
}) {
  return (
    <section className="panel settings-compact-panel">
      <div className="settings-group">
        <div className="panel-heading">
          <h3>Launch & Presence</h3>
        </div>
        <div className="settings-rows">
          <label className="settings-row">
            <span>Launch at login</span>
            <input type="checkbox" checked={settings.general.launchAtLogin} onChange={(event) => updateGeneral({ launchAtLogin: event.target.checked })} />
          </label>
          <label className="settings-row">
            <span>Show menu bar icon</span>
            <input type="checkbox" checked={settings.general.showMenuBarIcon} onChange={(event) => updateGeneral({ showMenuBarIcon: event.target.checked })} />
          </label>
          <label className="settings-row">
            <span>Show status indicator</span>
            <input type="checkbox" checked={settings.general.showExtensionStatus} onChange={(event) => updateGeneral({ showExtensionStatus: event.target.checked })} />
          </label>
        </div>
      </div>
      <div className="settings-group with-divider">
        <div className="panel-heading">
          <h3>Default Apps</h3>
        </div>
        <div className="settings-rows">
          <label className="settings-row stacked">
            <span>Default terminal</span>
            <select value={settings.integrations.defaultTerminal} onChange={(event) => updateIntegrations({ defaultTerminal: event.target.value as AppSettings["integrations"]["defaultTerminal"] })}>
              {["terminal", "iTerm", "ghostty"].map((tool) => <option key={tool} value={tool}>{tool}</option>)}
            </select>
          </label>
          <label className="settings-row stacked">
            <span>Default editor</span>
            <select value={settings.integrations.defaultEditor} onChange={(event) => updateIntegrations({ defaultEditor: event.target.value as AppSettings["integrations"]["defaultEditor"] })}>
              {["vscode", "cursor", "zed"].map((tool) => <option key={tool} value={tool}>{tool}</option>)}
            </select>
          </label>
        </div>
        <div className="settings-inline-summary">
          <StatusPill label={settings.integrations.defaultTerminal} tone="muted" />
          <StatusPill label={settings.integrations.defaultEditor} tone="muted" />
        </div>
      </div>
    </section>
  );
}

export function ToolsSettingsSection({
  toolRows,
  statusSummary
}: {
  toolRows: ToolRow[];
  statusSummary: StatusSummary;
}) {
  return (
    <section className="panel-grid two">
      <section className="panel tools-panel">
        <div className="panel-heading">
          <h3>Supported Tool Options</h3>
          <span className="panel-counter">{toolRows.length}</span>
        </div>
        <div className="choice-stack">
          {toolRows.map((tool) => (
            <div key={`catalog-${tool.tool}`} className="choice-card">
              <span>{tool.label}</span>
              <strong>{tool.family} · {tool.installType}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel tools-panel">
        <div className="panel-heading">
          <h3>Local Scan Results</h3>
          <span className="panel-counter">{toolRows.filter((item) => item.isInstalled).length}/{toolRows.length}</span>
        </div>
        <div className="panel-inline-pills">
          <StatusPill label={statusSummary.hasClaude ? "Claude Ready" : "Claude Missing"} tone={statusSummary.hasClaude ? "good" : "warn"} />
          <StatusPill label={statusSummary.hasCodex ? "Codex Ready" : "Codex Missing"} tone={statusSummary.hasCodex ? "good" : "warn"} />
          <StatusPill label={`${statusSummary.installedTools} Tools detected`} tone="muted" />
        </div>
        <div className="tools-table" role="table" aria-label="Detected apps">
          <div className="tools-table-header" role="row">
            <span>Tool option</span>
            <span>Scan result</span>
            <span>Status</span>
            <span>Menu Use</span>
          </div>
          {toolRows.map((tool) => (
            <div key={tool.tool} className="tools-table-row" role="row">
              <div className="tools-app-cell">
                <strong>{tool.label}</strong>
                <span className="muted">{tool.tool}</span>
              </div>
              <code className="tools-path-cell">{tool.path}</code>
              <StatusPill label={tool.isInstalled ? "Detected" : "Not installed"} tone={tool.isInstalled ? "good" : "warn"} />
              <span className={tool.allowMenuActions ? "tools-capability good" : "tools-capability muted"}>
                {tool.allowMenuActions ? "Enabled" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export function AISettingsSection({
  settings,
  statusSummary,
  activePromptPolicy,
  updateAI
}: {
  settings: AppSettings;
  statusSummary: StatusSummary;
  activePromptPolicy: AppSettings["ai"]["promptPolicies"][number] | undefined;
  updateAI: (patch: Partial<AppSettings["ai"]>) => void;
}) {
  return (
    <section className="panel-grid two">
      <section className="panel">
        <div className="panel-heading">
          <h3>Assistant</h3>
        </div>
        <div className="panel-inline-pills">
          <StatusPill label={statusSummary.hasClaude ? "Claude Ready" : "Claude Missing"} tone={statusSummary.hasClaude ? "good" : "warn"} />
          <StatusPill label={statusSummary.hasCodex ? "Codex Ready" : "Codex Missing"} tone={statusSummary.hasCodex ? "good" : "warn"} />
        </div>
        <label className="switch-row"><span>Enable assistant actions</span><input type="checkbox" checked={settings.ai.enabled} onChange={(event) => updateAI({ enabled: event.target.checked })} /></label>
        <div className="empty-card">
          <strong>Current path is CLI-only</strong>
          <p><code>ai.ask-claude</code> only appears when <code>claude</code> CLI is installed, and <code>ai.ask-codex</code> only appears when <code>codex</code> CLI is installed.</p>
          <p>API profiles remain reserved in settings data for a future upgrade, but they do not affect action visibility or execution in the current release.</p>
        </div>
      </section>
      <section className="panel">
        <h3>Prompt Style</h3>
        <label>Default policy
          <select value={settings.ai.defaultPromptPolicyID ?? ""} onChange={(event) => updateAI({ defaultPromptPolicyID: event.target.value })}>
            {settings.ai.promptPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}
          </select>
        </label>
        <label>System prompt
          <textarea value={activePromptPolicy?.systemPromptTemplate ?? ""} onChange={(event) => updateAI({ promptPolicies: settings.ai.promptPolicies.map((policy) => policy.id === settings.ai.defaultPromptPolicyID ? { ...policy, systemPromptTemplate: event.target.value } : policy) })} rows={10} />
        </label>
        <label>Max file size<input type="number" value={activePromptPolicy?.maxContextFileSize ?? 64000} onChange={(event) => updateAI({ promptPolicies: settings.ai.promptPolicies.map((policy) => policy.id === settings.ai.defaultPromptPolicyID ? { ...policy, maxContextFileSize: Number(event.target.value) } : policy) })} /></label>
        <label>Scan depth<input type="number" value={activePromptPolicy?.maxFolderScanDepth ?? 3} onChange={(event) => updateAI({ promptPolicies: settings.ai.promptPolicies.map((policy) => policy.id === settings.ai.defaultPromptPolicyID ? { ...policy, maxFolderScanDepth: Number(event.target.value) } : policy) })} /></label>
      </section>
    </section>
  );
}

export function TemplatesSettingsSection({
  settings,
  selectedTemplateID,
  setSelectedTemplateID,
  selectedTemplate,
  addTemplate,
  removeSelectedTemplate,
  updateTemplates,
  updateSelectedTemplate,
  chooseTemplateFolder
}: {
  settings: AppSettings;
  selectedTemplateID: string | null;
  setSelectedTemplateID: (id: string | null) => void;
  selectedTemplate: UserTemplateItem | null;
  addTemplate: () => void;
  removeSelectedTemplate: () => void;
  updateTemplates: (patch: Partial<AppSettings["templates"]>) => void;
  updateSelectedTemplate: (patch: Partial<UserTemplateItem>) => void;
  chooseTemplateFolder: () => Promise<void>;
}) {
  return (
    <section className="editor-layout">
      <section className="panel editor-side-panel">
        <h3>Template Source</h3>
        <label>Template folder
          <div className="inline-actions">
            <input value={settings.templates.customTemplateFolder} onChange={(event) => updateTemplates({ customTemplateFolder: event.target.value })} />
            <button className="secondary-button" onClick={() => void chooseTemplateFolder()}>Choose…</button>
          </div>
        </label>
        <div className="inline-actions top-gap">
          <button className="primary-button" onClick={addTemplate}>Add Template</button>
          <button className="secondary-button" onClick={removeSelectedTemplate} disabled={!selectedTemplate}>Remove</button>
        </div>
        <div className="list top-gap">
          {(settings.templates?.userTemplates ?? []).map((template) => (
            <button
              key={template.id}
              className={selectedTemplateID === template.id ? "list-item active-card" : "list-item active-buttonless"}
              onClick={() => setSelectedTemplateID(template.id)}
            >
              <div>
                <strong>{template.name}</strong>
                <p>.{template.fileExtension || "(none)"} · {template.defaultFileName}</p>
              </div>
              <input
                type="checkbox"
                checked={template.isEnabled}
                onChange={(event) => {
                  event.stopPropagation();
                  updateTemplates({
                    userTemplates: (settings.templates?.userTemplates ?? []).map((item) => item.id === template.id ? { ...item, isEnabled: event.target.checked } : item)
                  });
                }}
              />
            </button>
          ))}
        </div>
      </section>
      <section className="panel editor-main-panel">
        <h3>Template Details</h3>
        <h3 className="subtle-title">Content</h3>
        {selectedTemplate ? (
          <>
            <label>Name<input value={selectedTemplate.name} onChange={(event) => updateSelectedTemplate({ name: event.target.value })} /></label>
            <label>Extension<input value={selectedTemplate.fileExtension} onChange={(event) => updateSelectedTemplate({ fileExtension: event.target.value.replace(/^\./, "") })} /></label>
            <label>Default file name<input value={selectedTemplate.defaultFileName} onChange={(event) => updateSelectedTemplate({ defaultFileName: event.target.value })} /></label>
            <label className="switch-row"><span>Make executable</span><input type="checkbox" checked={selectedTemplate.makeExecutable} onChange={(event) => updateSelectedTemplate({ makeExecutable: event.target.checked })} /></label>
            <label>Starter content<textarea value={selectedTemplate.starterContent} onChange={(event) => updateSelectedTemplate({ starterContent: event.target.value })} rows={10} /></label>
          </>
        ) : (
          <p className="muted">Select a template to begin editing.</p>
        )}
      </section>
    </section>
  );
}

export function AdvancedSettingsSection({
  settings,
  activePromptPolicy,
  updateAI,
  updateAdvanced
}: {
  settings: AppSettings;
  activePromptPolicy: AppSettings["ai"]["promptPolicies"][number] | undefined;
  updateAI: (patch: Partial<AppSettings["ai"]>) => void;
  updateAdvanced: (patch: Partial<AppSettings["advanced"]>) => void;
}) {
  return (
    <section className="panel-grid two">
      <section className="panel">
        <h3>Advanced</h3>
        <label className="switch-row"><span>Include hidden files</span><input type="checkbox" checked={activePromptPolicy?.includeHiddenFiles ?? false} onChange={(event) => updateAI({ promptPolicies: settings.ai.promptPolicies.map((policy) => policy.id === settings.ai.defaultPromptPolicyID ? { ...policy, includeHiddenFiles: event.target.checked } : policy) })} /></label>
        <label className="switch-row"><span>Enable verbose logs</span><input type="checkbox" checked={settings.advanced.debugLogging} onChange={(event) => updateAdvanced({ debugLogging: event.target.checked })} /></label>
      </section>
      <section className="panel">
        <h3>Overview</h3>
        <div className="info-strip">
          <StatusPill label={activePromptPolicy?.includeHiddenFiles ? "Hidden Files Included" : "Hidden Files Ignored"} tone="muted" />
          <StatusPill label={settings.advanced.debugLogging ? "Verbose Logs" : "Standard Logs"} tone="muted" />
        </div>
      </section>
    </section>
  );
}
