"use client";

import { useEffect } from "react";

/**
 * Loads the Velrix widget script exactly as a customer's website would, so the
 * demo exercises the real embeddable widget (document.currentScript, config
 * fetch, CORS, start/message/poll).
 */
export function WidgetEmbed({ publicKey, host }: { publicKey: string; host?: string }) {
  useEffect(() => {
    // Defer past hydration so the widget's body injection can't race React.
    let script: HTMLScriptElement | null = null;
    const load = () => {
      if (document.querySelector("script[data-velrix-key]")) return;
      script = document.createElement("script");
      script.src = (host ?? "") + "/widget.js";
      script.async = true;
      script.setAttribute("data-velrix-key", publicKey);
      if (host) script.setAttribute("data-velrix-host", host);
      document.body.appendChild(script);
    };
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [publicKey, host]);
  return null;
}
