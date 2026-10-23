import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Lets a second dev server (for example one pointed at a test backend) run beside the main one.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // The browser only ever talks to this Next.js app. The /api/* proxy (app/api/[...path]) forwards to the
  // Spring Boot backend and adds the login token from an httpOnly cookie, so the token never reaches the
  // browser and the backend needs no CORS settings.
};

export default createNextIntlPlugin('./i18n/request.ts')(nextConfig);
