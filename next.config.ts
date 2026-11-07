import type { NextConfig } from "next";

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
  // Cabeceras HTTP oficiales de seguridad y blindaje web (OWASP / E-commerce Standard)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN", // Previene ataques de Clickjacking y marcos externos no autorizados
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Impide ejecución de código malicioso disfrazado de imágenes o estilos
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // Protege la privacidad de navegación de los clientes
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()", // Bloquea uso no autorizado de sensores
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload", // Fuerza conexión cifrada HTTPS (HSTS)
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block", // Protección nativa contra Cross-Site Scripting
          },
        ],
      },
    ];
  },
};

export default nextConfig;
