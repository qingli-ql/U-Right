import { useMemo } from "react";
import type {
  AppDiagnostics,
  AppSettings,
  ActionCategory
} from "../../contracts/contracts";
import type { ToolAvailabilityMap } from "./use-settings-persistence";
import {
  selectContextMenuWorkbenchViewModel,
  type ContextMenuWorkbenchViewModel
} from "../features/settings/model/settings-editor-selectors";

export function useContextMenuWorkbench({
  settings,
  tools,
  diagnostics,
  selectedCategory,
  selectedMenuActionID
}: {
  settings: AppSettings;
  tools: ToolAvailabilityMap;
  diagnostics: AppDiagnostics | null;
  selectedCategory: ActionCategory | null;
  selectedMenuActionID: string | null;
}): ContextMenuWorkbenchViewModel {
  return useMemo(
    () => selectContextMenuWorkbenchViewModel({
      settings,
      section: "context-menu",
      selectedCategory,
      selectedMenuActionID,
      selectedTemplateID: null,
      selectedOpenActionID: null,
      dragState: {
        draggedCategory: null,
        draggedActionID: null,
        dragHoverCategory: null,
        dragHoverActionID: null
      }
    }, tools, diagnostics),
    [diagnostics, selectedCategory, selectedMenuActionID, settings, tools]
  );
}
