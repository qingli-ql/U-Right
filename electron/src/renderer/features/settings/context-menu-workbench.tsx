import type {
  ActionCategory,
  AppDiagnostics,
  AppSettings,
  FinderActionContext,
  FinderMenuSnapshotAction
} from "../../../contracts/contracts";
import {
  ACTION_CATEGORY_META,
  actionTitleFor
} from "../../../contracts/action-registry";
import { StatusPill } from "../../chrome";
import type { ToolAvailabilityMap } from "../../hooks/use-settings-persistence";
import {
  applyActionPatch,
  applyCategoryPatch,
  applyCategoryReorder,
  moveActionInWorkbench,
  resetActionToDefault,
  resetCategoryToDefault
} from "./model/settings-editor-mutations";
import type { WorkbenchAction, WorkbenchCategory } from "./model/settings-editor-selectors";

export function ContextMenuWorkbench({
  settings,
  mutateSettings,
  diagnostics,
  actualSnapshot,
  actualContext,
  actualMenu,
  consistencyErrors,
  hasContextMenuConsistencyError,
  categories,
  categoryActions,
  enabledCategoryCount,
  enabledActionCount,
  selectedCategory,
  setSelectedCategory,
  selectedMenuActionID,
  setSelectedMenuActionID,
  selectedCategoryMeta,
  selectedMenuAction,
  finderSnapshotDiff,
  draggedCategory,
  setDraggedCategory,
  draggedActionID,
  setDraggedActionID,
  dragHoverCategory,
  setDragHoverCategory,
  dragHoverActionID,
  setDragHoverActionID,
  updateCustomActions,
  selectedOpenActionID,
  setSelectedOpenActionID,
  selectedOpenAction,
  updateSelectedOpenAction,
  addOpenAction,
  removeSelectedOpenAction,
  chooseAppForOpenAction
}: {
  settings: AppSettings;
  mutateSettings: (mutator: (current: AppSettings) => AppSettings) => void;
  diagnostics: AppDiagnostics | null;
  actualSnapshot: AppDiagnostics["finderMenuSnapshot"] | null;
  actualContext: FinderActionContext;
  actualMenu: FinderMenuSnapshotAction[];
  consistencyErrors: string[];
  hasContextMenuConsistencyError: boolean;
  categories: WorkbenchCategory[];
  categoryActions: WorkbenchAction[];
  enabledCategoryCount: number;
  enabledActionCount: number;
  selectedCategory: ActionCategory | null;
  setSelectedCategory: (value: ActionCategory) => void;
  selectedMenuActionID: string | null;
  setSelectedMenuActionID: (value: string | null) => void;
  selectedCategoryMeta: WorkbenchCategory | null;
  selectedMenuAction: WorkbenchAction | null;
  finderSnapshotDiff: string[];
  draggedCategory: ActionCategory | null;
  setDraggedCategory: (value: ActionCategory | null) => void;
  draggedActionID: string | null;
  setDraggedActionID: (value: string | null) => void;
  dragHoverCategory: ActionCategory | null;
  setDragHoverCategory: (value: ActionCategory | null) => void;
  dragHoverActionID: string | null;
  setDragHoverActionID: (value: string | null) => void;
  updateCustomActions: (patch: Partial<AppSettings["customActions"]>) => void;
  selectedOpenActionID: string | null;
  setSelectedOpenActionID: (value: string | null) => void;
  selectedOpenAction: NonNullable<AppSettings["customActions"]>["openActions"][number] | null;
  updateSelectedOpenAction: (patch: Partial<NonNullable<AppSettings["customActions"]>["openActions"][number]>) => void;
  addOpenAction: () => void;
  removeSelectedOpenAction: () => void;
  chooseAppForOpenAction: () => Promise<void>;
}) {
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
    if (!draggedActionID || !selectedCategory) {
      return;
    }
    const targetIndex = targetActionID ? categoryActions.findIndex((item) => item.actionID === targetActionID) : categoryActions.length;
    mutateSettings((current) =>
      moveActionInWorkbench(
        current,
        draggedActionID,
        selectedCategory,
        targetIndex < 0 ? categoryActions.length : targetIndex
      )
    );
    setSelectedMenuActionID(draggedActionID);
    setDraggedActionID(null);
    setDragHoverActionID(null);
  }

  if (hasContextMenuConsistencyError) {
    return (
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
    );
  }

  return (
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
              <div
                className="menu-list-dropzone"
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
                      selectedMenuActionID === action.actionID ? "selected" : "",
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
