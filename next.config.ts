import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Libera o dev server para acesso pela rede local (por IP), não só por
  // localhost. Sem isso, o Next 16 bloqueia os assets/HMR "cross-origin" e o
  // React não hidrata (toggle, modais e outras interações param de funcionar).
  allowedDevOrigins: [
    "192.168.3.110",
    "192.168.56.1",
    "192.168.3.*",
    "192.168.56.*",
  ],
};

export default nextConfig;
