import type { SaveState } from "../hooks/use-settings-persistence";

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

export const SETTINGS_SECTIONS = [
  { key: "general", title: "General", detail: "Launch, presence & apps", icon: GeneralIcon },
  { key: "context-menu", title: "Context Menu", detail: "Groups & actual menu", icon: ContextMenuIcon },
  { key: "tools", title: "Tools", detail: "Catalog & local scan", icon: ToolsIcon },
  { key: "ai", title: "Assistant", detail: "Model & prompt", icon: AssistantIcon },
  { key: "templates", title: "Templates", detail: "Starter files", icon: TemplatesIcon },
  { key: "advanced", title: "Advanced", detail: "Extra controls", icon: AdvancedIcon }
] as const;

export type SettingsSectionKey = typeof SETTINGS_SECTIONS[number]["key"];

export function SettingsSidebar({
  section,
  onSectionChange,
  showSaveNotice,
  saveState,
  canRestore,
  disableRestore,
  onRestore
}: {
  section: SettingsSectionKey;
  onSectionChange: (section: SettingsSectionKey) => void;
  showSaveNotice: boolean;
  saveState: SaveState;
  canRestore: boolean;
  disableRestore: boolean;
  onRestore: () => void;
}) {
  const saveLabel = saveState === "error"
    ? "Save"
    : saveState === "saving"
      ? "Saving"
      : saveState === "dirty"
        ? "Unsaved"
        : "Saved";

  return (
    <aside className="sidebar">
      <nav className="nav-list">
        {SETTINGS_SECTIONS.map(({ key, title, detail, icon: Icon }) => (
          <button key={key} className={section === key ? "nav-button active" : "nav-button"} onClick={() => onSectionChange(key)}>
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
          aria-label={saveState === "error" ? "Save failed" : saveLabel}
          title={saveState === "error" ? "Save failed" : saveLabel}
          disabled
        >
          <span className="sidebar-segment-icon" aria-hidden="true">
            {saveState === "error" ? <AlertIcon /> : <CheckIcon />}
          </span>
          <span className="sidebar-segment-label">{saveLabel}</span>
        </button>
        <button
          className="sidebar-footer-segment sidebar-restore-icon"
          type="button"
          aria-label="Restore Previous"
          title="Restore Previous"
          disabled={!canRestore || disableRestore}
          onClick={onRestore}
        >
          <span className="sidebar-segment-icon" aria-hidden="true"><RestoreIcon /></span>
          <span className="sidebar-segment-label">Restore</span>
        </button>
      </div>
    </aside>
  );
}
