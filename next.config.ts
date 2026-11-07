import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https:;
  font-src 'self' https://fonts.gstatic.com data:;
  connect-src 'self' https: http://127.0.0.1:* http://localhost:*;
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "cms.bassfit.com",
      },
    ],
  },
  // Cabeceras HTTP oficiales de seguridad y blindaje web (OWASP Top 10)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN", // Previene ataques de Clickjacking
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Impide ejecución de código malicioso disfrazado de imagen
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // Protege la privacidad de navegación
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()", // Bloquea acceso a sensores
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload", // Fuerza conexión HTTPS cifrada (HSTS)
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block", // Protección nativa contra XSS
          },
        ],
      },
    ];
  },
};

export default nextConfig;
