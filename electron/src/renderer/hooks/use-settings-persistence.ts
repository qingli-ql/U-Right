import { useEffect, useMemo, useRef, useState } from "react";
import type { AppDiagnostics, AppSettings, SettingsHistorySnapshot } from "../../contracts/contracts";
import { createDefaultSettings } from "../../contracts/defaults";
import type { getUrightAPI } from "../chrome";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type ToolAvailabilityMap = Record<string, {
  isInstalled: boolean;
  executablePath?: string;
  appPath?: string;
}>;

export function useSettingsPersistence(api: ReturnType<typeof getUrightAPI>) {
  const [editingSettings, setEditingSettings] = useState<AppSettings>(createDefaultSettings());
  const [persistedSettings, setPersistedSettings] = useState<AppSettings>(createDefaultSettings());
  const [tools, setTools] = useState<ToolAvailabilityMap>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("All changes saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveNotice, setShowSaveNotice] = useState(false);
  const [previousSnapshot, setPreviousSnapshot] = useState<SettingsHistorySnapshot | null>(null);
  const [diagnostics, setDiagnostics] = useState<AppDiagnostics | null>(null);
  const hasLoadedRef = useRef(false);
  const inFlightSaveIDRef = useRef(0);
  const pendingSaveSnapshotRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void Promise.all([api.loadSettings(), api.detectTools(), api.loadPreviousSettings(), api.loadDiagnostics()]).then(([loaded, detected, previous, nextDiagnostics]) => {
      setEditingSettings(loaded);
      setPersistedSettings(loaded);
      setTools(detected);
      setPreviousSnapshot(previous);
      setDiagnostics(nextDiagnostics);
      setSaveState("idle");
      setSaveMessage("All changes saved");
      setSaveError(null);
      setIsDirty(false);
      hasLoadedRef.current = true;
    });
  }, [api]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      return;
    }
    const editingSerialized = JSON.stringify(editingSettings);
    const persistedSerialized = JSON.stringify(persistedSettings);
    const dirty = editingSerialized !== persistedSerialized;
    setIsDirty(dirty);

    if (!dirty) {
      pendingSaveSnapshotRef.current = null;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      setSaveState((current) => (current === "saved" ? current : "idle"));
      setSaveMessage("All changes saved");
      setSaveError(null);
      return;
    }

    setSaveState((current) => (current === "saving" ? current : "dirty"));
    setSaveMessage("Unsaved changes");
    setSaveError(null);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    pendingSaveSnapshotRef.current = editingSerialized;
    saveTimerRef.current = window.setTimeout(() => {
      const snapshotSerialized = pendingSaveSnapshotRef.current;
      if (!snapshotSerialized) {
        return;
      }
      const saveID = ++inFlightSaveIDRef.current;
      setSaveState("saving");
      setSaveMessage("Saving changes...");
      void api.saveSettingsTransaction(JSON.parse(snapshotSerialized) as AppSettings)
        .then((transaction) => {
          if (saveID !== inFlightSaveIDRef.current) {
            return;
          }
          const canonicalSerialized = JSON.stringify(transaction.settings);
          setPersistedSettings(transaction.settings);
          setPreviousSnapshot(transaction.previousSnapshot);
          setDiagnostics(transaction.diagnostics);
          setEditingSettings((current) => {
            const currentSerialized = JSON.stringify(current);
            if (currentSerialized === snapshotSerialized || currentSerialized === canonicalSerialized) {
              return transaction.settings;
            }
            return current;
          });
          setSaveState("saved");
          setSaveMessage("All changes saved");
          setSaveError(null);
        })
        .catch((error) => {
          if (saveID !== inFlightSaveIDRef.current) {
            return;
          }
          setSaveState("error");
          setSaveMessage("Unable to save changes");
          setSaveError(error instanceof Error ? error.message : String(error));
        });
    }, 250);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [api, editingSettings, persistedSettings]);

  useEffect(() => {
    if (saveState === "saved") {
      setShowSaveNotice(true);
      const timer = window.setTimeout(() => setShowSaveNotice(false), 1800);
      return () => window.clearTimeout(timer);
    }
    if (saveState === "error" || saveState === "saving" || saveState === "dirty") {
      setShowSaveNotice(true);
      return;
    }
    setShowSaveNotice(false);
  }, [saveState]);

  const statusSummary = useMemo(() => {
    const values = Object.values(tools);
    return {
      installedTools: values.filter((item) => item.isInstalled).length,
      hasClaude: Boolean(tools.claude?.isInstalled),
      hasCodex: Boolean(tools.codex?.isInstalled)
    };
  }, [tools]);

  async function restorePrevious() {
    const restored = await api.restorePreviousSettings();
    if (!restored) {
      setSaveState("error");
      setSaveMessage("No previous version available");
      setSaveError("No previous version available");
      return;
    }
    hasLoadedRef.current = false;
    setEditingSettings(restored.settings);
    setPersistedSettings(restored.settings);
    setPreviousSnapshot(await api.loadPreviousSettings());
    setDiagnostics(await api.loadDiagnostics());
    setIsDirty(false);
    setSaveError(null);
    hasLoadedRef.current = true;
    setSaveState("saved");
    setSaveMessage("Previous version restored");
  }

  return {
    settings: editingSettings,
    setSettings: setEditingSettings,
    tools,
    saveState,
    saveMessage,
    saveError,
    isDirty,
    showSaveNotice,
    previousSnapshot,
    diagnostics,
    statusSummary,
    restorePrevious
  };
}
