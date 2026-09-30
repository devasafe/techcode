import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Gera .next/standalone com um server.js e só as dependências usadas —
  // é o que permite a imagem Docker enxuta do deploy no Coolify.
  output: "standalone",
};

export default nextConfig;
