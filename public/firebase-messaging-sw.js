/* Service worker de push (FCM) + habilita instalação PWA (handler de fetch).
 * A config PÚBLICA do Firebase chega via query string ao registrar o SW
 * (ver lib/sw-url.ts). Sem config, o SW só serve para a instalação da PWA. */

const params = new URL(self.location).searchParams;
const config = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // no-op: sem cache; necessário apenas para a instalação da PWA.
});

if (config.apiKey && config.messagingSenderId && config.appId) {
  importScripts(
    "https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js"
  );
  importScripts(
    "https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js"
  );

  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  // Notificação recebida com o app fechado / em segundo plano.
  messaging.onBackgroundMessage((payload) => {
    const title =
      payload.notification?.title || payload.data?.title || "Registro de Horas";
    const body = payload.notification?.body || payload.data?.body || "";
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });
  });
}
