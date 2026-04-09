import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { WindowContextPayload } from "../../contracts/contracts";
import { getUrightAPI, Shell } from "../chrome";
import {
  LogsView as AuxiliaryLogsView,
  OnboardingView as AuxiliaryOnboardingView,
  PromptView as AuxiliaryPromptView,
  ResultView as AuxiliaryResultView
} from "./auxiliary-windows";

export function AppRouter({
  renderSettings
}: {
  renderSettings: () => ReactNode;
}) {
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
    return <Shell chromeTitle="Loading Workspace" chromeMeta="U-Right Runtime"><div className="window loading-window"><p>Loading U-Right...</p></div></Shell>;
  }

  switch (context.kind) {
    case "settings":
      return renderSettings();
    case "prompt":
      return <AuxiliaryPromptView payload={context.prompt!} />;
    case "result":
      return <AuxiliaryResultView payload={context.result!} />;
    case "logs":
      return <AuxiliaryLogsView />;
    case "onboarding":
      return <AuxiliaryOnboardingView />;
    default:
      return null;
  }
}
