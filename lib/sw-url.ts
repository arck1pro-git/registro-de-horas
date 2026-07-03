// Monta a URL do service worker de push, embutindo a config PÚBLICA do Firebase
// via query string (o SW é estático e lê a config de self.location).
// Sem firebase aqui de propósito — pode ser importado sem puxar o SDK.

const publicConfig: Record<string, string | undefined> = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseConfig() {
  return publicConfig;
}

export function firebaseConfigured() {
  const c = publicConfig;
  return !!(
    c.apiKey &&
    c.projectId &&
    c.messagingSenderId &&
    c.appId &&
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  );
}

/** URL do service worker, com a config pública como query string (se houver). */
export function fcmServiceWorkerUrl() {
  const entries = Object.entries(publicConfig).filter(
    ([, v]) => !!v
  ) as [string, string][];
  const qs = new URLSearchParams(entries).toString();
  return `/firebase-messaging-sw.js${qs ? `?${qs}` : ""}`;
}
