"use client";

import { useEffect } from "react";
import { fcmServiceWorkerUrl } from "@/lib/sw-url";

/**
 * Registra o service worker. Ele habilita a instalação como PWA e, quando as
 * chaves do Firebase estão configuradas, também recebe as notificações push.
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(fcmServiceWorkerUrl()).catch(() => {
        // registro falhou (ex.: http sem localhost); ignora silenciosamente
      });
    }
  }, []);
  return null;
}
