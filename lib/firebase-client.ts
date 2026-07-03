"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
} from "firebase/messaging";
import { firebaseConfig, firebaseConfigured, fcmServiceWorkerUrl } from "./sw-url";

let app: FirebaseApp | undefined;
function ensureApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig() as Record<string, string>);
  }
  return app;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register(fcmServiceWorkerUrl());
}

/**
 * Pede permissão, gera o token FCM deste dispositivo e o retorna.
 * Lança erro com mensagem amigável se algo impedir.
 */
export async function enableNotifications(): Promise<string> {
  if (!firebaseConfigured()) {
    throw new Error("Notificações ainda não configuradas no servidor.");
  }
  if (!("serviceWorker" in navigator) || !(await isSupported())) {
    throw new Error("Seu navegador não suporta notificações push.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificação negada.");
  }

  const registration = await registerServiceWorker();
  const messaging = getMessaging(ensureApp());
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) throw new Error("Não foi possível gerar o token.");
  return token;
}

/** Remove o token FCM deste dispositivo (o app limpa no servidor à parte). */
export async function disableNotifications(): Promise<void> {
  try {
    if (firebaseConfigured() && (await isSupported())) {
      const messaging = getMessaging(ensureApp());
      await deleteToken(messaging);
    }
  } catch {
    // ignora: o essencial é limpar o token no banco
  }
}
