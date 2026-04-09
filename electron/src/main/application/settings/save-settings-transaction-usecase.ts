import type {
  AppDiagnostics,
  AppSettings,
  SettingsHistorySnapshot
} from "../../../contracts/contracts";
import { loadAppDiagnostics } from "../diagnostics/diagnostics-repository";
import {
  loadPreviousSettingsSnapshot,
  saveSettings
} from "./settings-repository";

export interface SaveSettingsTransactionResult {
  settings: AppSettings;
  previousSnapshot: SettingsHistorySnapshot | null;
  diagnostics: AppDiagnostics;
}

export interface SaveSettingsTransactionDependencies {
  saveSettings: (settings: AppSettings) => AppSettings;
  loadPreviousSettingsSnapshot: () => SettingsHistorySnapshot | null;
  loadAppDiagnostics: () => AppDiagnostics;
}

const DEFAULT_DEPENDENCIES: SaveSettingsTransactionDependencies = {
  saveSettings,
  loadPreviousSettingsSnapshot,
  loadAppDiagnostics
};

export function saveSettingsTransactionUseCase(
  settings: AppSettings,
  dependencies: SaveSettingsTransactionDependencies = DEFAULT_DEPENDENCIES
): SaveSettingsTransactionResult {
  const saved = dependencies.saveSettings(settings);
  const previousSnapshot = dependencies.loadPreviousSettingsSnapshot();
  const diagnostics = dependencies.loadAppDiagnostics();
  return {
    settings: saved,
    previousSnapshot,
    diagnostics
  };
}
