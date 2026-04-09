import { useEffect, useMemo, useState } from "react";
import type { ActionCategory, AppSettings, UserTemplateItem } from "../../../contracts/contracts";
import { TOOL_CATALOG } from "../../../contracts/tool-catalog";
import { getUrightAPI, Shell } from "../../chrome";
import {
  AdvancedSettingsSection,
  AISettingsSection,
  GeneralSettingsSection,
  TemplatesSettingsSection,
  ToolsSettingsSection
} from "../../components/settings-sections";
import { SettingsSidebar, SETTINGS_SECTIONS, type SettingsSectionKey } from "../../components/settings-sidebar";
import { useSettingsPersistence } from "../../hooks/use-settings-persistence";
import { ContextMenuWorkbench } from "./context-menu-workbench";
import { useContextMenuWorkbenchViewModel } from "./model/settings-editor-selectors";

export function SettingsScreen() {
  const api = getUrightAPI();
  const {
    settings,
    setSettings,
    tools,
    saveState,
    showSaveNotice,
    previousSnapshot,
    diagnostics,
    statusSummary,
    restorePrevious
  } = useSettingsPersistence(api);
  const [section, setSection] = useState<SettingsSectionKey>("context-menu");
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | null>("create");
  const [selectedMenuActionID, setSelectedMenuActionID] = useState<string | null>(null);
  const [selectedTemplateID, setSelectedTemplateID] = useState<string | null>(null);
  const [selectedOpenActionID, setSelectedOpenActionID] = useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [draggedActionID, setDraggedActionID] = useState<string | null>(null);
  const [dragHoverCategory, setDragHoverCategory] = useState<string | null>(null);
  const [dragHoverActionID, setDragHoverActionID] = useState<string | null>(null);

  const workbenchState = useMemo(() => ({
    settings,
    section,
    selectedCategory,
    selectedMenuActionID,
    selectedTemplateID,
    selectedOpenActionID,
    dragState: {
      draggedCategory,
      draggedActionID,
      dragHoverCategory,
      dragHoverActionID
    }
  }), [
    dragHoverActionID,
    dragHoverCategory,
    draggedActionID,
    draggedCategory,
    section,
    selectedCategory,
    selectedMenuActionID,
    selectedOpenActionID,
    selectedTemplateID,
    settings
  ]);
  const {
    actualSnapshot,
    actualContext,
    actualMenu,
    consistencyErrors,
    hasContextMenuConsistencyError,
    categories,
    categoryActions,
    enabledCategoryCount,
    enabledActionCount,
    selectedCategory: activeCategory,
    selectedCategoryMeta,
    selectedMenuAction,
    finderSnapshotDiff
  } = useContextMenuWorkbenchViewModel(workbenchState, tools, diagnostics);

  const selectedTemplate = useMemo(
    () => settings.templates?.userTemplates.find((item) => item.id === selectedTemplateID) ?? null,
    [selectedTemplateID, settings.templates?.userTemplates]
  );
  const selectedOpenAction = useMemo(
    () => settings.customActions?.openActions.find((item) => item.id === selectedOpenActionID) ?? null,
    [selectedOpenActionID, settings.customActions?.openActions]
  );
  const sectionMeta = SETTINGS_SECTIONS.find((item) => item.key === section) ?? SETTINGS_SECTIONS[0];
  const activePromptPolicy = settings.ai.promptPolicies.find((policy) => policy.id === settings.ai.defaultPromptPolicyID) ?? settings.ai.promptPolicies[0];

  useEffect(() => {
    if (!selectedMenuActionID || !categoryActions.some((item) => item.actionID === selectedMenuActionID)) {
      setSelectedMenuActionID(categoryActions[0]?.actionID ?? null);
    }
  }, [categoryActions, selectedMenuActionID]);

  useEffect(() => {
    const firstCategory = settings.contextMenu.categorySettings[0]?.category ?? "create";
    if (!selectedCategory || !settings.contextMenu.categorySettings.some((item) => item.category === selectedCategory)) {
      setSelectedCategory(firstCategory);
    }
    if (!selectedTemplateID || !settings.templates.userTemplates.some((item) => item.id === selectedTemplateID)) {
      setSelectedTemplateID(settings.templates.userTemplates[0]?.id ?? null);
    }
    if (!selectedOpenActionID || !settings.customActions.openActions.some((item) => item.id === selectedOpenActionID)) {
      setSelectedOpenActionID(settings.customActions.openActions[0]?.id ?? null);
    }
  }, [selectedCategory, selectedOpenActionID, selectedTemplateID, settings.contextMenu.categorySettings, settings.customActions.openActions, settings.templates.userTemplates]);

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
      updateTemplates({ customTemplateFolder: selected });
    }
  }

  return (
    <Shell chromeTitle="Preferences" chromeMeta="U-Right">
      <div className="window settings-window">
        <SettingsSidebar
          section={section}
          onSectionChange={setSection}
          showSaveNotice={showSaveNotice}
          saveState={saveState}
          canRestore={Boolean(previousSnapshot)}
          disableRestore={saveState === "saving"}
          onRestore={() => void restorePrevious()}
        />
        <main className="content">
          <header className="section-header">
            <div className="section-heading">
              <p className="eyebrow">{sectionMeta.detail}</p>
              <h2>{sectionMeta.title}</h2>
            </div>
          </header>

          {section === "general" ? (
            <GeneralSettingsSection
              settings={settings}
              updateGeneral={updateGeneral}
              updateIntegrations={updateIntegrations}
            />
          ) : null}

          {section === "context-menu" ? (
            <ContextMenuWorkbench
              settings={settings}
              mutateSettings={mutateSettings}
              diagnostics={diagnostics}
              actualSnapshot={actualSnapshot}
              actualContext={actualContext}
              actualMenu={actualMenu}
              consistencyErrors={consistencyErrors}
              hasContextMenuConsistencyError={hasContextMenuConsistencyError}
              categories={categories}
              categoryActions={categoryActions}
              enabledCategoryCount={enabledCategoryCount}
              enabledActionCount={enabledActionCount}
              selectedCategory={activeCategory}
              setSelectedCategory={setSelectedCategory}
              selectedMenuActionID={selectedMenuActionID}
              setSelectedMenuActionID={setSelectedMenuActionID}
              selectedCategoryMeta={selectedCategoryMeta}
              selectedMenuAction={selectedMenuAction}
              finderSnapshotDiff={finderSnapshotDiff}
              draggedCategory={draggedCategory}
              setDraggedCategory={setDraggedCategory}
              draggedActionID={draggedActionID}
              setDraggedActionID={setDraggedActionID}
              dragHoverCategory={dragHoverCategory}
              setDragHoverCategory={setDragHoverCategory}
              dragHoverActionID={dragHoverActionID}
              setDragHoverActionID={setDragHoverActionID}
              updateCustomActions={updateCustomActions}
              selectedOpenActionID={selectedOpenActionID}
              setSelectedOpenActionID={setSelectedOpenActionID}
              selectedOpenAction={selectedOpenAction}
              updateSelectedOpenAction={updateSelectedOpenAction}
              addOpenAction={addOpenAction}
              removeSelectedOpenAction={removeSelectedOpenAction}
              chooseAppForOpenAction={chooseAppForOpenAction}
            />
          ) : null}

          {section === "tools" ? (
            <ToolsSettingsSection
              toolRows={toolRows}
              statusSummary={statusSummary}
            />
          ) : null}

          {section === "ai" ? (
            <AISettingsSection
              settings={settings}
              statusSummary={statusSummary}
              activePromptPolicy={activePromptPolicy}
              updateAI={updateAI}
            />
          ) : null}

          {section === "templates" ? (
            <TemplatesSettingsSection
              settings={settings}
              selectedTemplateID={selectedTemplateID}
              setSelectedTemplateID={setSelectedTemplateID}
              selectedTemplate={selectedTemplate}
              addTemplate={addTemplate}
              removeSelectedTemplate={removeSelectedTemplate}
              updateTemplates={updateTemplates}
              updateSelectedTemplate={updateSelectedTemplate}
              chooseTemplateFolder={chooseTemplateFolder}
            />
          ) : null}

          {section === "advanced" ? (
            <AdvancedSettingsSection
              settings={settings}
              activePromptPolicy={activePromptPolicy}
              updateAI={updateAI}
              updateAdvanced={updateAdvanced}
            />
          ) : null}
        </main>
      </div>
    </Shell>
  );
}
