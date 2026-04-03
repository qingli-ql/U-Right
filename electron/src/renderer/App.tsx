import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { AppDiagnostics, FinderActionContext, FinderMenuSnapshotAction, AppSettings, PromptWindowPayload, ResultWindowPayload, SettingsHistorySnapshot, UserTemplateItem, WindowContextPayload } from "../shared/contracts";
import {
  ACTION_CATEGORY_META,
  TOOL_ORDER,
  applyActionPatch,
  applyCategoryPatch,
  applyCategoryReorder,
  actionTitleFor,
  buildSettingsCategoryWorkbenchItems,
  buildSettingsActionInspectorItems,
  definitionFor,
  moveActionInWorkbench,
  resetActionToDefault,
  resetCategoryToDefault,
  resolveCategory
} from "../shared/action-registry";
import { createDefaultSettings } from "../shared/defaults";
import { TOOL_CATALOG } from "../shared/tool-catalog";
import type { LogEntry } from "../main/types";

function getUrightAPI() {
  if (typeof window === "undefined" || !window.uright) {
    throw new Error("Electron preload bridge is unavailable. Check BrowserWindow preload/contextIsolation configuration.");
  }
  return window.uright;
}

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span className="logo-mark-ring" />
      <span className="logo-mark-u">U</span>
      <span className="logo-mark-slash" />
      <span className="logo-mark-r">R</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.4 8.2 6.5 11.3 12.6 4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6.2 4.2H3.7v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.9 6.4A5 5 0 1 1 3.8 9.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 4.2v4.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="11.7" r="1" fill="currentColor" />
    </svg>
  );
}

function GeneralIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h10M3 8h10M3 11.5h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="6" cy="4.5" r="1.5" fill="currentColor" />
      <circle cx="10.5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ContextMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="3" width="11" height="10" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5.8h6.2M5 8h4.6M5 10.3h5.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11.8" cy="10.3" r="0.9" fill="currentColor" />
    </svg>
  );
}

function ToolsIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.6 3.2a2.5 2.5 0 0 0-.7 2.2l-4.8 4.8a1.1 1.1 0 1 0 1.6 1.6l4.8-4.8a2.5 2.5 0 0 0 2.2-.7 2.4 2.4 0 0 1-2.1-.6 2.4 2.4 0 0 1-.6-2.1Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m10.8 9.1 1.9 1.9M9.7 10.2l1.9 1.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function AssistantIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.4 8.8 4.8 11.2 5.6 8.8 6.4 8 8.8 7.2 6.4 4.8 5.6 7.2 4.8Z" fill="currentColor" />
      <path d="M11.7 8.8 12.1 10 13.3 10.4 12.1 10.8 11.7 12 11.3 10.8 10.1 10.4 11.3 10Z" fill="currentColor" />
      <path d="M4.3 8.9a2.8 2.8 0 0 0 2.9 2.7h1.3L10 13.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TemplatesIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 2.8h5.1l2 2v7.9H5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 4.4H3.2v8.8H10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.1 2.8v2H12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 7.6h4M6.5 9.8h3.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function AdvancedIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5 8.7 4.1l1.8.3-1.3 1.3.3 1.8L8 6.7l-1.5.8.3-1.8-1.3-1.3 1.8-.3Z" fill="currentColor" />
      <path d="M3.6 9.7h8.8M3.6 12h6.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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
      </div>
      {children}
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "good" | "muted" | "warn" }) {
  return <div className={`status-pill ${tone}`}>{label}</div>;
}

const SETTINGS_SECTIONS = [
  { key: "general", title: "General", detail: "Launch, presence & apps", icon: GeneralIcon },
  { key: "context-menu", title: "Context Menu", detail: "Groups & actual menu", icon: ContextMenuIcon },
  { key: "tools", title: "Tools", detail: "Catalog & local scan", icon: ToolsIcon },
  { key: "ai", title: "Assistant", detail: "Model & prompt", icon: AssistantIcon },
  { key: "templates", title: "Templates", detail: "Starter files", icon: TemplatesIcon },
  { key: "advanced", title: "Advanced", detail: "Extra controls", icon: AdvancedIcon }
] as const;

function SettingsView() {
  const api = getUrightAPI();
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings());
  const [tools, setTools] = useState<Record<string, { isInstalled: boolean; executablePath?: string; appPath?: string }>>({});
  const [section, setSection] = useState("context-menu");
  const [selectedCategory, setSelectedCategory] = useState<string>("create");
  const [selectedMenuActionID, setSelectedMenuActionID] = useState<string | null>(null);
  const [selectedTemplateID, setSelectedTemplateID] = useState<string | null>(null);
  const [selectedOpenActionID, setSelectedOpenActionID] = useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [draggedActionID, setDraggedActionID] = useState<string | null>(null);
  const [dragHoverCategory, setDragHoverCategory] = useState<string | null>(null);
  const [dragHoverActionID, setDragHoverActionID] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("All changes saved");
  const [showSaveNotice, setShowSaveNotice] = useState(false);
  const [previousSnapshot, setPreviousSnapshot] = useState<SettingsHistorySnapshot | null>(null);
  const [diagnostics, setDiagnostics] = useState<AppDiagnostics | null>(null);
  const hasLoadedRef = useRef(false);
  const lastPersistedRef = useRef("");
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void Promise.all([api.loadSettings(), api.detectTools(), api.loadPreviousSettings(), api.loadDiagnostics()]).then(([loaded, detected, previous, nextDiagnostics]) => {
      setSettings(loaded);
      setTools(detected);
      setPreviousSnapshot(previous);
      setDiagnostics(nextDiagnostics);
      setSelectedCategory(loaded.contextMenu.categorySettings[0]?.category ?? "create");
      setSelectedTemplateID(loaded.templates?.userTemplates[0]?.id ?? null);
      setSelectedOpenActionID(loaded.customActions?.openActions[0]?.id ?? null);
      lastPersistedRef.current = JSON.stringify(loaded);
      hasLoadedRef.current = true;
    });
  }, [api]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      return;
    }
    const serialized = JSON.stringify(settings);
    if (serialized === lastPersistedRef.current) {
      return;
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    setSaveState("saving");
    setSaveMessage("Saving changes…");
    saveTimerRef.current = window.setTimeout(() => {
      void api.saveSettings(settings)
        .then(async (saved) => {
          const normalized = JSON.stringify(saved);
          lastPersistedRef.current = normalized;
          setSettings((current) => (JSON.stringify(current) === normalized ? current : saved));
          const previous = await api.loadPreviousSettings();
          const nextDiagnostics = await api.loadDiagnostics();
          setPreviousSnapshot(previous);
          setDiagnostics(nextDiagnostics);
          setSaveState("saved");
          setSaveMessage("All changes saved");
        })
        .catch(() => {
          setSaveState("error");
          setSaveMessage("Unable to save changes");
        });
    }, 250);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [api, settings]);

  const statusSummary = useMemo(() => {
    const values = Object.values(tools);
    return {
      installedTools: values.filter((item) => item.isInstalled).length,
      hasClaude: Boolean(tools.claude?.isInstalled),
      hasCodex: Boolean(tools.codex?.isInstalled)
    };
  }, [tools]);

  const actualSnapshot = diagnostics?.finderMenuSnapshot ?? null;
  const actualContext = useMemo(
    () => actualSnapshot?.context ?? createFallbackFinderContext(tools, diagnostics?.availableScriptNames ?? []),
    [actualSnapshot, diagnostics?.availableScriptNames, tools]
  );
  const actualMenu = actualSnapshot?.menu ?? [];
  const consistencyErrors = diagnostics?.errors ?? [];
  const hasContextMenuConsistencyError = consistencyErrors.length > 0;
  const categories = useMemo(
    () => buildSettingsCategoryWorkbenchItems(actualContext, settings),
    [actualContext, settings]
  );
  const categoryActions = useMemo(
    () => buildSettingsActionInspectorItems(selectedCategory as AppSettings["contextMenu"]["categorySettings"][number]["category"], actualContext, settings),
    [actualContext, selectedCategory, settings]
  );
  const allActionInspectorItems = useMemo(
    () => ACTION_CATEGORY_META.flatMap((meta) => buildSettingsActionInspectorItems(meta.category, actualContext, settings)),
    [actualContext, settings]
  );

  const selectedTemplate = useMemo(
    () => settings.templates?.userTemplates.find((item) => item.id === selectedTemplateID) ?? null,
    [selectedTemplateID, settings.templates?.userTemplates]
  );
  const selectedOpenAction = useMemo(
    () => settings.customActions?.openActions.find((item) => item.id === selectedOpenActionID) ?? null,
    [selectedOpenActionID, settings.customActions?.openActions]
  );
  const sectionMeta = SETTINGS_SECTIONS.find((item) => item.key === section) ?? SETTINGS_SECTIONS[0];
  const enabledCategoryCount = categories.filter((item) => item.isEnabled).length;
  const enabledActionCount = categoryActions.filter((item) => item.settingEnabled).length;
  const selectedCategoryMeta = categories.find((item) => item.category === selectedCategory) ?? categories[0] ?? null;
  const selectedMenuAction = categoryActions.find((item) => item.actionID === selectedMenuActionID) ?? categoryActions[0] ?? null;
  const activeAIProfile = settings.ai.profiles.find((profile) => profile.id === settings.ai.defaultProfileID) ?? settings.ai.profiles[0];
  const activePromptPolicy = settings.ai.promptPolicies.find((policy) => policy.id === settings.ai.defaultPromptPolicyID) ?? settings.ai.promptPolicies[0];
  const finderSnapshotDiff = useMemo(
    () => buildActualMenuDiff(allActionInspectorItems, actualMenu),
    [actualMenu, allActionInspectorItems]
  );

  useEffect(() => {
    if (!selectedMenuActionID || !categoryActions.some((item) => item.actionID === selectedMenuActionID)) {
      setSelectedMenuActionID(categoryActions[0]?.actionID ?? null);
    }
  }, [categoryActions, selectedMenuActionID]);

  useEffect(() => {
    if (saveState === "saved") {
      setShowSaveNotice(true);
      const timer = window.setTimeout(() => setShowSaveNotice(false), 1800);
      return () => window.clearTimeout(timer);
    }
    if (saveState === "error") {
      setShowSaveNotice(true);
      return;
    }
    setShowSaveNotice(false);
  }, [saveState]);

  const toolRows = useMemo(() => {
    return TOOL_CATALOG.map((entry) => {
      const availability = tools[entry.kind];
      const preference = settings.integrations.toolPreferences.find((item) => item.kind === entry.kind);
      return {
        tool: entry.kind,
        label: entry.label,
        family: entry.family,
        installType: entry.installType,
        path: availability?.executablePath ?? availability?.appPath ?? "Not detected",
        isInstalled: Boolean(availability?.isInstalled),
        allowMenuActions: preference?.allowMenuActions ?? true
      };
    });
  }, [settings.integrations.toolPreferences, tools]);

  function mutateSettings(mutator: (current: AppSettings) => AppSettings) {
    setSettings((current) => mutator(current));
  }

  function updateSettings(next: AppSettings) {
    setSettings(next);
  }

  function updateGeneral(patch: Partial<NonNullable<AppSettings["general"]>>) {
    updateSettings({
      ...settings,
      ...patch,
      general: {
        ...settings.general!,
        ...patch
      }
    });
  }

  function updateIntegrations(patch: Partial<AppSettings["integrations"]>) {
    updateSettings({
      ...settings,
      integrations: {
        ...settings.integrations,
        ...patch
      }
    });
  }

  function updateTemplates(patch: Partial<AppSettings["templates"]>) {
    updateSettings({
      ...settings,
      templates: {
        ...settings.templates,
        ...patch
      }
    });
  }

  function updateAI(patch: Partial<AppSettings["ai"]>) {
    updateSettings({
      ...settings,
      ai: {
        ...settings.ai,
        ...patch
      }
    });
  }

  function updateAdvanced(patch: Partial<AppSettings["advanced"]>) {
    updateSettings({
      ...settings,
      advanced: {
        ...settings.advanced,
        ...patch
      }
    });
  }

  function updateCustomActions(patch: Partial<AppSettings["customActions"]>) {
    updateSettings({
      ...settings,
      customActions: {
        ...settings.customActions,
        ...patch
      }
    });
  }

  function addTemplate() {
    const id = `template-${Date.now()}`;
    const nextTemplate: UserTemplateItem = {
      id,
      name: "New Template",
      fileExtension: "txt",
      defaultFileName: "untitled",
      starterContent: "",
      makeExecutable: false,
      isEnabled: true,
      sortOrder: (settings.templates?.userTemplates.at(-1)?.sortOrder ?? 0) + 10
    };
    updateTemplates({
      userTemplates: [...(settings.templates?.userTemplates ?? []), nextTemplate]
    });
    setSelectedTemplateID(id);
  }

  function updateSelectedTemplate(patch: Partial<UserTemplateItem>) {
    if (!selectedTemplate) {
      return;
    }
    updateTemplates({
      userTemplates: (settings.templates?.userTemplates ?? []).map((item) => item.id === selectedTemplate.id ? { ...item, ...patch } : item)
    });
  }

  function removeSelectedTemplate() {
    if (!selectedTemplate) {
      return;
    }
    const remaining = (settings.templates?.userTemplates ?? []).filter((item) => item.id !== selectedTemplate.id);
    updateTemplates({ userTemplates: remaining });
    setSelectedTemplateID(remaining[0]?.id ?? null);
  }

  function addOpenAction() {
    const id = `open-action-${Date.now()}`;
    const nextAction = {
      id,
      name: "Open in App",
      appPath: "",
      bundleIdentifier: null,
      targetKind: "any" as const,
      isEnabled: true,
      sortOrder: (settings.customActions?.openActions.at(-1)?.sortOrder ?? 0) + 10,
      category: "open" as const
    };
    updateCustomActions({
      openActions: [...(settings.customActions?.openActions ?? []), nextAction]
    });
    setSelectedOpenActionID(id);
  }

  function updateSelectedOpenAction(patch: Partial<NonNullable<AppSettings["customActions"]>["openActions"][number]>) {
    if (!selectedOpenAction) {
      return;
    }
    updateCustomActions({
      openActions: (settings.customActions?.openActions ?? []).map((item) => item.id === selectedOpenAction.id ? { ...item, ...patch } : item)
    });
  }

  function removeSelectedOpenAction() {
    if (!selectedOpenAction) {
      return;
    }
    const remaining = (settings.customActions?.openActions ?? []).filter((item) => item.id !== selectedOpenAction.id);
    updateCustomActions({ openActions: remaining });
    setSelectedOpenActionID(remaining[0]?.id ?? null);
  }

  async function chooseAppForOpenAction() {
    const selected = await api.chooseApp();
    if (selected) {
      updateSelectedOpenAction({
        appPath: selected,
        name: selected.replace(/^.*\//, "").replace(/\.app$/i, "")
      });
    }
  }

  async function chooseTemplateFolder() {
    const selected = await api.chooseDirectory();
    if (selected) {
      setSettings({ ...settings, customTemplateFolder: selected });
    }
  }

  function handleCategoryDrop(targetCategory: string) {
    if (!draggedCategory || draggedCategory === targetCategory) {
      setDraggedCategory(null);
      setDragHoverCategory(null);
      return;
    }
    const ordered = categories.map((item) => item.category);
    const sourceIndex = ordered.indexOf(draggedCategory as AppSettings["contextMenu"]["categorySettings"][number]["category"]);
    const targetIndex = ordered.indexOf(targetCategory as AppSettings["contextMenu"]["categorySettings"][number]["category"]);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedCategory(null);
      setDragHoverCategory(null);
      return;
    }
    const next = ordered.slice();
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    mutateSettings((current) => applyCategoryReorder(current, next));
    setDraggedCategory(null);
    setDragHoverCategory(null);
  }

  function moveSelectedActionTo(category: AppSettings["contextMenu"]["categorySettings"][number]["category"], targetIndex?: number) {
    if (!selectedMenuAction) {
      return;
    }
    mutateSettings((current) => moveActionInWorkbench(current, selectedMenuAction.actionID, category, targetIndex ?? 0));
    setSelectedCategory(category);
    setSelectedMenuActionID(selectedMenuAction.actionID);
  }

  function handleActionDrop(targetActionID: string | null) {
    if (!draggedActionID) {
      return;
    }
    const targetIndex = targetActionID ? categoryActions.findIndex((item) => item.actionID === targetActionID) : categoryActions.length;
    mutateSettings((current) =>
      moveActionInWorkbench(
        current,
        draggedActionID,
        selectedCategory as AppSettings["contextMenu"]["categorySettings"][number]["category"],
        targetIndex < 0 ? categoryActions.length : targetIndex
      )
    );
    setSelectedMenuActionID(draggedActionID);
    setDraggedActionID(null);
    setDragHoverActionID(null);
  }

  async function restorePrevious() {
    const restored = await api.restorePreviousSettings();
    if (!restored) {
      setSaveState("error");
      setSaveMessage("No previous version available");
      return;
    }
    hasLoadedRef.current = false;
    setSettings(restored.settings);
    setPreviousSnapshot(await api.loadPreviousSettings());
    setDiagnostics(await api.loadDiagnostics());
    lastPersistedRef.current = JSON.stringify(restored.settings);
    hasLoadedRef.current = true;
    setSaveState("saved");
    setSaveMessage("Previous version restored");
  }

  return (
    <Shell chromeTitle="Preferences" chromeMeta="U-Right">
      <div className="window settings-window">
        <aside className="sidebar">
          <nav className="nav-list">
            {SETTINGS_SECTIONS.map(({ key, title, detail, icon: Icon }) => (
              <button key={key} className={section === key ? "nav-button active" : "nav-button"} onClick={() => setSection(key)}>
                <span className="nav-icon" aria-hidden="true"><Icon /></span>
                <span className="nav-copy">
                  <span className="nav-title">{title}</span>
                  <small>{detail}</small>
                </span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer" aria-label="Save controls">
            <button
              className={`sidebar-footer-segment sidebar-save-button ${showSaveNotice ? saveState : "idle"}`}
              type="button"
              aria-label={saveState === "error" ? "Save failed" : "Saved"}
              title={saveState === "error" ? "Save failed" : "Saved"}
              disabled
            >
              <span className="sidebar-segment-icon" aria-hidden="true">
                {saveState === "error" ? <AlertIcon /> : <CheckIcon />}
              </span>
              <span className="sidebar-segment-label">{saveState === "error" ? "Save" : "Saved"}</span>
            </button>
            <button
              className="sidebar-footer-segment sidebar-restore-icon"
              type="button"
              aria-label="Restore Previous"
              title="Restore Previous"
              disabled={!previousSnapshot || saveState === "saving"}
              onClick={() => void restorePrevious()}
            >
              <span className="sidebar-segment-icon" aria-hidden="true"><RestoreIcon /></span>
              <span className="sidebar-segment-label">Restore</span>
            </button>
          </div>
        </aside>
        <main className="content">
          <header className="section-header">
            <div className="section-heading">
              <p className="eyebrow">{sectionMeta.detail}</p>
              <h2>{sectionMeta.title}</h2>
            </div>
          </header>

          {section === "general" && (
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
                    <select value={settings.integrations.defaultTerminal} onChange={(event) => updateIntegrations({ defaultTerminal: event.target.value as AppSettings["defaultTerminal"] })}>
                      {TOOL_ORDER.slice(0, 3).map((tool) => <option key={tool} value={tool}>{tool}</option>)}
                    </select>
                  </label>
                  <label className="settings-row stacked">
                    <span>Default editor</span>
                    <select value={settings.integrations.defaultEditor} onChange={(event) => updateIntegrations({ defaultEditor: event.target.value as AppSettings["defaultEditor"] })}>
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
          )}

          {section === "context-menu" && (
            hasContextMenuConsistencyError ? (
            <section className="panel-grid two">
              <section className="panel">
                <div className="panel-heading">
                  <h3>Consistency Error</h3>
                  <span className="panel-counter">ERROR</span>
                </div>
                <p className="muted">Context Menu 页面已切换到严格一致性模式。只要拿不到真实 Finder 数据，页面就直接报错，不再显示推测结果。</p>
                <div className="choice-stack">
                  {consistencyErrors.map((item) => (
                    <div key={item} className="choice-card">
                      <span>Error</span>
                      <strong>{item}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Diagnostics</h3>
                  <span className="panel-counter">Raw</span>
                </div>
                <div className="choice-stack">
                  <div className="choice-card"><span>App group</span><strong>{diagnostics?.appGroupIdentifier ?? "error"}</strong></div>
                  <div className="choice-card"><span>Shared root</span><strong>{diagnostics?.sharedRoot ?? "error"}</strong></div>
                  <div className="choice-card"><span>Settings file</span><strong>{diagnostics?.settingsFile ?? "error"}</strong></div>
                  <div className="choice-card"><span>Settings version</span><strong>{String(diagnostics?.settingsVersion ?? "error")}</strong></div>
                  <div className="choice-card"><span>Snapshot</span><strong>{actualSnapshot ? "present" : "error"}</strong></div>
                </div>
                {diagnostics?.warning ? <p className="muted warning-copy">{diagnostics.warning}</p> : null}
              </section>
            </section>
            ) : (
            <section className="menu-workbench">
              <section className="panel menu-sidebar-panel">
                <div className="panel-heading">
                  <h3>Groups</h3>
                  <span className="panel-counter">{enabledCategoryCount}/{categories.length}</span>
                </div>
                <div className="menu-sidebar-tools">
                  <label className="switch-row compact">
                    <span>Collapse singles</span>
                    <input
                      type="checkbox"
                      checked={settings.contextMenu.collapseSingleActionGroups}
                      onChange={(event) => mutateSettings((current) => ({
                        ...current,
                        contextMenu: {
                          ...current.contextMenu,
                          collapseSingleActionGroups: event.target.checked
                        }
                      }))}
                    />
                  </label>
                  <label className="switch-row compact">
                    <span>Show unavailable in inspector</span>
                    <input
                      type="checkbox"
                      checked={settings.contextMenu.showUnavailableInPreview}
                      onChange={(event) => mutateSettings((current) => ({
                        ...current,
                        contextMenu: {
                          ...current.contextMenu,
                          showUnavailableInPreview: event.target.checked
                        }
                      }))}
                    />
                  </label>
                </div>
                <div className="list">
                  {categories.map((category) => (
                    <button
                      key={category.category}
                      draggable
                      className={[
                        selectedCategory === category.category ? "list-item active-card menu-category-item" : "list-item active-buttonless menu-category-item",
                        draggedCategory === category.category ? "dragging" : "",
                        dragHoverCategory === category.category ? "drop-target" : "",
                        draggedActionID ? "accepts-action-drop" : ""
                      ].filter(Boolean).join(" ")}
                      onClick={() => setSelectedCategory(category.category)}
                      onDragStart={() => {
                        setDraggedCategory(category.category);
                        setDraggedActionID(null);
                      }}
                      onDragEnd={() => {
                        setDraggedCategory(null);
                        setDragHoverCategory(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragHoverCategory(category.category);
                      }}
                      onDragLeave={() => {
                        if (dragHoverCategory === category.category) {
                          setDragHoverCategory(null);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedActionID) {
                          mutateSettings((current) => moveActionInWorkbench(current, draggedActionID, category.category, Number.MAX_SAFE_INTEGER));
                          setSelectedCategory(category.category);
                          setSelectedMenuActionID(draggedActionID);
                          setDraggedActionID(null);
                          setDragHoverCategory(null);
                          return;
                        }
                        handleCategoryDrop(category.category);
                      }}
                    >
                      <div>
                        <strong>{category.title}</strong>
                        <p>{category.displayStyle} · {actualSnapshot ? `${category.visibleActionCount}/${category.actionCount} in last actual context` : `${category.actionCount} configured actions`}</p>
                      </div>
                      <div className="menu-category-controls">
                        <span className="drag-handle" aria-hidden="true">⋮⋮</span>
                        <input
                          type="checkbox"
                          checked={category.isEnabled}
                          onChange={(event) => {
                            event.stopPropagation();
                            mutateSettings((current) => applyCategoryPatch(current, category.category, { isEnabled: event.target.checked }));
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
              <section className="menu-main">
                <section className="panel menu-topbar">
                  <div className="menu-topbar-copy">
                    <h3>{ACTION_CATEGORY_META.find((item) => item.category === selectedCategory)?.title ?? selectedCategory}</h3>
                    <div className="info-strip">
                      <StatusPill label={`${enabledActionCount} Enabled`} tone="muted" />
                      <StatusPill label={actualSnapshot ? `Actual: ${formatSelectionKind(actualContext.selectionKind)}` : "No Finder snapshot yet"} tone={actualSnapshot ? "good" : "warn"} />
                      <StatusPill label={`${diagnostics?.availableScriptNames?.length ?? 0} Runtime Scripts`} tone="muted" />
                    </div>
                  </div>
                  <p className="muted">{actualSnapshot ? "Context Menu workbench now reflects the last Finder menu the extension actually built." : "Open a Finder context menu once to capture the real menu and context here."}</p>
                </section>
                <section className="menu-split">
                  <section className="menu-column">
                    <section className="panel">
                      <div className="panel-heading">
                        <h3>Items</h3>
                        <span className="panel-counter">{categoryActions.length}</span>
                      </div>
                      <div className="menu-list-dropzone"
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragHoverActionID(null);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleActionDrop(null);
                        }}
                      >
                        Drop here to move into this group
                      </div>
                      <div className="list menu-action-list">
                        {categoryActions.map((action) => (
                          <div
                            key={action.actionID}
                            draggable
                            className={[
                              "list-item menu-action-item",
                              selectedMenuAction?.actionID === action.actionID ? "selected" : "",
                              draggedActionID === action.actionID ? "dragging" : "",
                              dragHoverActionID === action.actionID ? "drop-target" : ""
                            ].filter(Boolean).join(" ")}
                            onClick={() => setSelectedMenuActionID(action.actionID)}
                            onDragStart={() => {
                              setDraggedActionID(action.actionID);
                              setDraggedCategory(null);
                            }}
                            onDragEnd={() => {
                              setDraggedActionID(null);
                              setDragHoverActionID(null);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDragHoverActionID(action.actionID);
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleActionDrop(action.actionID);
                            }}
                          >
                            <div className="menu-action-copy">
                              <strong>{action.title ?? actionTitleFor(action.actionID)}</strong>
                              <p>{action.actionID}</p>
                              <div className="menu-action-meta">
                                <span className="menu-context-pill">{action.supportedContexts.join(" / ")}</span>
                              </div>
                            </div>
                            <div className="menu-action-controls">
                              <span className="drag-handle" aria-hidden="true">⋮⋮</span>
                              <input
                                type="checkbox"
                                checked={action.settingEnabled}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  mutateSettings((current) => applyActionPatch(current, action.actionID, { isEnabled: event.target.checked }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="panel menu-detail-panel">
                      <div className="panel-heading">
                        <h3>Inspector</h3>
                        <span className="panel-counter">{selectedMenuAction ? "Action" : "Group"}</span>
                      </div>
                      {selectedMenuAction && selectedCategoryMeta ? (
                        <div className="menu-detail-stack">
                          <div className="menu-detail-card emphasis">
                            <p className="detail-kicker">{selectedCategoryMeta.title}</p>
                            <h4>{selectedMenuAction.title}</h4>
                            <p>{selectedMenuAction.actionID}</p>
                          </div>
                          <div className="menu-detail-card">
                            <h4>Resolved placement</h4>
                            <p>{selectedMenuAction.placementLabel}</p>
                          </div>
                          <div className="menu-detail-card">
                            <h4>Resolved target</h4>
                            <p>{selectedMenuAction.resolvedTargetLabel}</p>
                          </div>
                          <div className="menu-detail-card">
                            <h4>Actual status</h4>
                            <p>{selectedMenuAction.appearsInCurrentContext ? "Appears in last actual Finder menu" : (selectedMenuAction.currentReason ?? "Hidden in last actual Finder menu")}</p>
                          </div>
                          <div className="menu-detail-grid">
                            <label>Group
                              <select
                                value={selectedCategoryMeta.category}
                                onChange={(event) => moveSelectedActionTo(event.target.value as AppSettings["contextMenu"]["categorySettings"][number]["category"], Number.MAX_SAFE_INTEGER)}
                              >
                                {categories.map((category) => <option key={category.category} value={category.category}>{category.title}</option>)}
                              </select>
                            </label>
                            <label>Layout
                              <select
                                value={selectedCategoryMeta.displayStyle}
                                onChange={(event) => mutateSettings((current) => applyCategoryPatch(current, selectedCategoryMeta.category, { displayStyle: event.target.value as "inline" | "submenu" }))}
                              >
                                <option value="submenu">submenu</option>
                                <option value="inline">inline</option>
                              </select>
                            </label>
                          </div>
                          <div className="menu-detail-grid">
                            <label className="switch-row compact">
                              <span>Action enabled</span>
                              <input
                                type="checkbox"
                                checked={selectedMenuAction.settingEnabled}
                                onChange={(event) => mutateSettings((current) => applyActionPatch(current, selectedMenuAction.actionID, { isEnabled: event.target.checked }))}
                              />
                            </label>
                            <label className="switch-row compact">
                              <span>Group enabled</span>
                              <input
                                type="checkbox"
                                checked={selectedCategoryMeta.isEnabled}
                                onChange={(event) => mutateSettings((current) => applyCategoryPatch(current, selectedCategoryMeta.category, { isEnabled: event.target.checked }))}
                              />
                            </label>
                          </div>
                          <div className="menu-detail-card">
                            <h4>Quick actions</h4>
                            <div className="menu-quick-grid">
                              <button className="secondary-button compact-button" onClick={() => moveSelectedActionTo(selectedCategoryMeta.category, 0)}>Move to top</button>
                              <button className="secondary-button compact-button" onClick={() => moveSelectedActionTo(selectedCategoryMeta.category, categoryActions.length - 1)}>Move to bottom</button>
                              <button className="secondary-button compact-button" onClick={() => mutateSettings((current) => resetActionToDefault(current, selectedMenuAction.actionID))}>Reset action</button>
                              <button className="secondary-button compact-button" onClick={() => mutateSettings((current) => resetCategoryToDefault(current, selectedCategoryMeta.category))}>Reset group</button>
                            </div>
                          </div>
                        </div>
                      ) : selectedCategoryMeta ? (
                        <div className="menu-detail-stack">
                          <div className="menu-detail-card emphasis">
                            <p className="detail-kicker">Group</p>
                            <h4>{selectedCategoryMeta.title}</h4>
                            <p>{actualSnapshot ? `${selectedCategoryMeta.visibleActionCount}/${selectedCategoryMeta.actionCount} appear in the last actual Finder context` : `${selectedCategoryMeta.actionCount} configured actions`}</p>
                          </div>
                        </div>
                      ) : null}
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h3>Open With Entries</h3>
                        <span className="panel-counter">{settings.customActions?.openActions?.length ?? 0}</span>
                      </div>
                      <div className="editor-layout context-inline-editor">
                        <section className="editor-side-panel">
                          <div className="inline-actions">
                            <button className="primary-button" onClick={addOpenAction}>Add Entry</button>
                            <button className="secondary-button" onClick={removeSelectedOpenAction} disabled={!selectedOpenAction}>Remove</button>
                          </div>
                          <div className="list top-gap">
                            {(settings.customActions?.openActions ?? []).map((item) => (
                              <button
                                key={item.id}
                                className={selectedOpenActionID === item.id ? "list-item active-card" : "list-item active-buttonless"}
                                onClick={() => setSelectedOpenActionID(item.id)}
                              >
                                <div>
                                  <strong>{item.name}</strong>
                                  <p>{item.targetKind} · {item.appPath || "No app selected"}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={item.isEnabled}
                                  onChange={(event) => {
                                    event.stopPropagation();
                                    updateCustomActions({
                                      openActions: (settings.customActions?.openActions ?? []).map((openAction) => openAction.id === item.id ? { ...openAction, isEnabled: event.target.checked } : openAction)
                                    });
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        </section>
                        <section className="editor-main-panel">
                          {selectedOpenAction ? (
                            <>
                              <label>Name<input value={selectedOpenAction.name} onChange={(event) => updateSelectedOpenAction({ name: event.target.value })} /></label>
                              <label>Applies to
                                <select value={selectedOpenAction.targetKind} onChange={(event) => updateSelectedOpenAction({ targetKind: event.target.value as "file" | "folder" | "any" })}>
                                  <option value="any">Any</option>
                                  <option value="file">Files</option>
                                  <option value="folder">Folders</option>
                                </select>
                              </label>
                              <label>Application
                                <div className="inline-actions">
                                  <input value={selectedOpenAction.appPath} onChange={(event) => updateSelectedOpenAction({ appPath: event.target.value })} />
                                  <button className="secondary-button" onClick={() => void chooseAppForOpenAction()}>Choose…</button>
                                </div>
                              </label>
                              <label>Category
                                <select value={selectedOpenAction.category} onChange={(event) => updateSelectedOpenAction({ category: event.target.value as "open" | "view" | "advanced" })}>
                                  <option value="open">Open</option>
                                  <option value="view">View</option>
                                  <option value="advanced">Advanced</option>
                                </select>
                              </label>
                            </>
                          ) : (
                            <p className="muted">Select an entry to begin editing.</p>
                          )}
                        </section>
                      </div>
                    </section>
                  </section>
                  <section className="panel preview-panel">
                    <div className="panel-heading">
                      <h3>Last Actual Finder Menu</h3>
                      <span className="panel-counter">{actualSnapshot ? "Actual" : "Waiting"}</span>
                    </div>
                    <p className="muted">{actualSnapshot ? "Captured from the Finder Sync extension’s most recent real menu build." : "No actual Finder snapshot yet. Right-click once in Finder, then reopen this panel."}</p>
                    {actualMenu.length > 0 ? (
                      <div className="preview-box menu-preview-surface">
                        {actualMenu.map((descriptor) => (
                          <FinderSnapshotPreviewItem key={descriptor.id} descriptor={descriptor} depth={0} />
                        ))}
                      </div>
                    ) : null}
                    {actualSnapshot ? (
                      <div className="menu-context-summary">
                        <div className="choice-card"><span>Selection</span><strong>{formatSelectionKind(actualContext.selectionKind)}</strong></div>
                        <div className="choice-card"><span>Target</span><strong>{actualContext.resolvedTargetDirectory ?? "none"}</strong></div>
                        <div className="choice-card"><span>Primary</span><strong>{actualContext.resolvedPrimaryTarget ?? actualContext.primaryURL ?? "none"}</strong></div>
                      </div>
                    ) : null}
                    <details className="inspector-disclosure">
                      <summary>Comparison & diagnostics</summary>
                      <div className="menu-diagnostics-grid">
                        <div className="menu-detail-card">
                          <h4>Configured Actions vs Actual Menu</h4>
                          {finderSnapshotDiff.length > 0 ? (
                            <div className="choice-stack">
                              {finderSnapshotDiff.map((item) => <div key={item} className="choice-card"><span>{item}</span></div>)}
                            </div>
                          ) : (
                            <p className="muted">{actualSnapshot ? "Configured actions and the last actual Finder menu currently match at the leaf-action level." : "Waiting for the first actual Finder menu snapshot."}</p>
                          )}
                        </div>
                        <div className="menu-detail-card">
                          <h4>Diagnostics</h4>
                          <p>App group: <code>{diagnostics?.appGroupIdentifier ?? "unknown"}</code></p>
                          <p>Shared root: <code>{diagnostics?.sharedRoot ?? "unknown"}</code></p>
                          <p>Settings file: <code>{diagnostics?.settingsFile ?? "unknown"}</code></p>
                          <p>Settings version: <code>{String(diagnostics?.settingsVersion ?? 0)}</code></p>
                          {diagnostics?.warning ? <p className="muted warning-copy">{diagnostics.warning}</p> : null}
                        </div>
                      </div>
                    </details>
                  </section>
                </section>
              </section>
            </section>
            )
          )}

          {section === "tools" && (
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
          )}

          {section === "ai" && (
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
                <label>Default profile
                  <select value={settings.ai?.defaultProfileID ?? ""} onChange={(event) => updateAI({ defaultProfileID: event.target.value })}>
                    {(settings.ai?.profiles ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select>
                </label>
                <label>Preferred provider
                  <select value={settings.ai.preferredProvider} onChange={(event) => updateAI({ preferredProvider: event.target.value as AppSettings["preferredAIProvider"] })}>
                    {["auto", "claudeCLI", "codexCLI", "openAICompatible"].map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                  </select>
                </label>
                <label>Base URL<input value={activeAIProfile?.apiBaseURL ?? ""} onChange={(event) => updateAI({ profiles: settings.ai.profiles.map((profile) => profile.id === settings.ai.defaultProfileID ? { ...profile, apiBaseURL: event.target.value } : profile) })} /></label>
                <label>API key<input type="password" value={activeAIProfile?.apiKey ?? ""} onChange={(event) => updateAI({ profiles: settings.ai.profiles.map((profile) => profile.id === settings.ai.defaultProfileID ? { ...profile, apiKey: event.target.value } : profile) })} /></label>
                <label>Model<input value={activeAIProfile?.apiModel ?? ""} onChange={(event) => updateAI({ profiles: settings.ai.profiles.map((profile) => profile.id === settings.ai.defaultProfileID ? { ...profile, apiModel: event.target.value } : profile) })} /></label>
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
          )}

          {section === "templates" && (
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
          )}

          {section === "advanced" && (
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
          )}

        </main>
      </div>
    </Shell>
  );
}

function FinderSnapshotPreviewItem({
  descriptor,
  depth
}: {
  descriptor: FinderMenuSnapshotAction;
  depth: number;
}) {
  return (
    <div className="menu-preview-node" style={{ marginLeft: depth * 14 }}>
      <div className={descriptor.isEnabled ? "menu-preview-row" : "menu-preview-row disabled"}>
        <span>{descriptor.title}</span>
        <div className="menu-preview-meta">
          {descriptor.statusBadge ? <span className="menu-preview-badge">{descriptor.statusBadge}</span> : null}
          {descriptor.children.length > 0 ? <span className="menu-preview-chevron">›</span> : null}
        </div>
      </div>
      {descriptor.children.map((child) => (
        <FinderSnapshotPreviewItem key={child.id} descriptor={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function flattenSnapshotActionIDs(
  descriptors: FinderMenuSnapshotAction[],
  output: string[] = []
): string[] {
  for (const descriptor of descriptors) {
    if (descriptor.children.length === 0) {
      output.push(descriptor.id);
      continue;
    }
    flattenSnapshotActionIDs(descriptor.children, output);
  }
  return output;
}

function formatSelectionKind(kind: string): string {
  switch (kind) {
    case "file":
      return "File";
    case "folder":
      return "Folder";
    case "multi":
      return "Multi";
    case "empty":
      return "Empty Area";
    case "mixed":
      return "Mixed";
    default:
      return kind;
  }
}

function createFallbackFinderContext(
  tools: Record<string, { isInstalled: boolean; executablePath?: string; appPath?: string }>,
  scriptNames: string[]
): FinderActionContext {
  return {
    selectedURLs: [],
    primaryURL: null,
    currentDirectoryURL: null,
    resolvedTargetDirectory: null,
    resolvedPrimaryTarget: null,
    resolvedSelectionDirectory: null,
    selectionKind: "empty" as const,
    detectedTools: tools,
    fileMetadata: [],
    capabilities: {
      hasWorkingDirectory: false,
      hasWritableTarget: false,
      scriptNames
    }
  };
}

function buildActualMenuDiff(
  configuredActions: Array<{
    actionID: string;
    settingEnabled: boolean;
    appearsInCurrentContext: boolean;
    currentReason?: string;
  }>,
  actualMenu: FinderMenuSnapshotAction[]
): string[] {
  const actual = new Set(flattenSnapshotActionIDs(actualMenu));
  const diff = configuredActions.flatMap((action) => {
    if (!action.settingEnabled) {
      return [];
    }
    if (actual.has(action.actionID)) {
      return [`Appears in actual menu: ${action.actionID}`];
    }
    return [`Configured but missing in actual menu: ${action.actionID}${action.currentReason ? ` (${action.currentReason})` : ""}`];
  });
  for (const actionID of [...actual].filter((id) => !configuredActions.some((item) => item.actionID === id))) {
    diff.push(`Only in actual menu: ${actionID}`);
  }
  return diff.sort();
}

function PromptView({ payload }: { payload: PromptWindowPayload }) {
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
          <textarea className="prompt-area" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={onKeyDown} rows={18} />
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
  const [isClearing, setIsClearing] = useState(false);

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
        <div className="hero compact">
          <div>
            <p className="eyebrow">Structured Logs</p>
            <h2>Host + Finder bridge visibility</h2>
          </div>
          <div className="footer-actions">
            <div className="footer-badge">{logs.length} entries</div>
            <button className="secondary-button" disabled={isClearing} onClick={() => void handleClearLogs()}>
              {isClearing ? "Clearing..." : "Clear Logs"}
            </button>
          </div>
        </div>
        <div className="log-list">
          {orderedLogs.length === 0 && <p className="muted">No logs yet.</p>}
          {orderedLogs.map((entry) => (
            <div key={entry.id} className={`log-entry log-entry-${entry.level.toLowerCase()}`}>
              <div className="log-entry-meta">
                <span>{entry.level}</span>
                <strong>{entry.subsystem}</strong>
                <time>{entry.timestamp || "-"}</time>
              </div>
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
          setBridgeError("The Electron main process did not return a window context.");
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
