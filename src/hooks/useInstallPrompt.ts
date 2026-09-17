import { useState, useEffect, useCallback } from "react";

// ── Captura global do beforeinstallprompt ──────────────────────────────
// O evento pode disparar ANTES do componente montar (durante login/loading).
// Listener no nível do módulo garante que não perdemos o evento.
let capturedPrompt: any = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    capturedPrompt = e;
  });
}

// ── Tipos ─────────────────────────────────────────────────────────────

type Platform = "android" | "ios" | "windows" | "other";

interface InstallPromptReturn {
  /** Se o banner deve ser exibido */
  shouldShow: boolean;
  /** Plataforma detectada */
  platform: Platform;
  /** Se o install nativo (one-click) está disponível */
  canNativeInstall: boolean;
  /** Função de instalação nativa */
  install: () => Promise<void>;
  /** Função para dispensar (salva em localStorage) */
  dismiss: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Windows/i.test(ua)) return "windows";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((window.navigator as any).standalone === true) return true; // iOS Safari
  if (window.matchMedia("(display-mode: window-controls-overlay)").matches) return true;
  return false;
}

const DISMISS_KEY = "painsorriso53_pwa_install_dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useInstallPrompt(): InstallPromptReturn {
  const platform = getPlatform();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(capturedPrompt);
  const [dismissed, setDismissed] = useState(() => wasDismissed());
  const [installed, setInstalled] = useState(() => isStandalone());

  // Listener para beforeinstallprompt (pode chegar a qualquer momento)
  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      capturedPrompt = e;
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Detectar quando o app foi instalado (appinstall é disparado após instalação)
  useEffect(() => {
    function handler() {
      setInstalled(true);
      setDeferredPrompt(null);
      capturedPrompt = null;
    }
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  const canNativeInstall = !!deferredPrompt;

  const shouldShow = !dismissed && !installed && (
    canNativeInstall || // Windows/Android com evento
    platform === "ios" || // iOS sempre manual
    platform === "android" // Android pode ser manual se sem evento
  );

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
    } catch {
      // ignore
    }
    setDeferredPrompt(null);
    capturedPrompt = null;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }, []);

  return { shouldShow, platform, canNativeInstall, install, dismiss };
}
