import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Sent with every page. HSTS only has an effect over https.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // A self-contained server for the Docker image (node server.js).
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Lets a second dev server (for example one pointed at a test backend) run beside the main one.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // The browser only ever talks to this Next.js app. The /api/* proxy (app/api/[...path]) forwards to the
  // Spring Boot backend and adds the login token from an httpOnly cookie, so the token never reaches the
  // browser and the backend needs no CORS settings.
};

export default createNextIntlPlugin('./i18n/request.ts')(nextConfig);
