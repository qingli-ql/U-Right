import type { ReactNode } from "react";

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

export function getUrightAPI() {
  if (typeof window === "undefined" || !window.uright) {
    throw new Error("Electron preload bridge is unavailable. Check BrowserWindow preload/contextIsolation configuration.");
  }
  return window.uright;
}

export function Shell({
  children,
  chromeTitle,
  chromeMeta
}: {
  children: ReactNode;
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

export function StatusPill({ label, tone }: { label: string; tone: "good" | "muted" | "warn" }) {
  return <div className={`status-pill ${tone}`}>{label}</div>;
}
