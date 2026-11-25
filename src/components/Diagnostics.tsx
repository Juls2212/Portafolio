"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { collectReport } from "@/lib/capabilities";
import { getErrors, reportError, subscribeErrors } from "@/lib/diagnostics";
import { useT } from "@/i18n/language-context";

const noop = () => () => {};
/** True only when the URL carries ?debug=1 (never on the server, never otherwise). */
function useDebugFlag(): boolean {
  return useSyncExternalStore(
    noop,
    () => {
      try {
        return new URLSearchParams(window.location.search).get("debug") === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
}

/**
 * Hidden diagnostics panel: rendered only with ?debug=1 (Shift+D shows or hides it). It lists what the
 * site detected about this browser and which mode each animated piece runs in, plus the last caught
 * animation errors. "Copy report" puts it on the clipboard; nothing is ever sent anywhere.
 */
export function Diagnostics() {
  const enabled = useDebugFlag();
  if (!enabled) return null;
  return <Panel />;
}

function Panel() {
  const t = useT();
  const [open, setOpen] = useState(true);
  const [tick, setTick] = useState(0);
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const errors = useSyncExternalStore(subscribeErrors, () => getErrors().length, () => 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === "d" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const el = event.target;
        if (el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
        setOpen((o) => !o);
      }
    };
    const onError = (event: ErrorEvent) => reportError("window", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportError("promise", event.reason);
    window.addEventListener("keydown", onKey);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    // Modes change (resize, motion choice, GL failure): refresh the report now and then.
    const id = window.setInterval(() => setTick((n) => n + 1), 1500);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.clearInterval(id);
    };
  }, []);

  if (!open) return null;
  void tick;
  void errors;
  const report = { ...collectReport(), recentErrors: getErrors().map((e) => ({ at: new Date(e.at).toISOString(), source: e.source, message: e.message })) };
  const text = JSON.stringify(report, null, 2);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopy("done");
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        setCopy(ok ? "done" : "failed");
      } catch {
        setCopy("failed");
      }
    }
    window.setTimeout(() => setCopy("idle"), 2200);
  };

  return (
    <aside className="diag" role="region" aria-label={t.debug.title} data-testid="diagnostics">
      <header className="diag__bar">
        <strong>{t.debug.title}</strong>
        <span className="diag__actions">
          <button type="button" onClick={copyReport}>
            {copy === "done" ? t.debug.copied : copy === "failed" ? t.debug.copyFailed : t.debug.copy}
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            {t.debug.close}
          </button>
        </span>
      </header>
      <p className="diag__hint">{t.debug.hint}</p>
      <pre className="diag__body">{text}</pre>
    </aside>
  );
}
