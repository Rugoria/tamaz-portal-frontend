# Frontend image: Next.js in standalone mode, run as a non-root user.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY . .
# NEXT_PUBLIC_* values are fixed when the image is built. false hides every "Preview only" screen (set it to true only for a demo build).
ARG NEXT_PUBLIC_SHOW_PENDING=false
ENV NEXT_PUBLIC_SHOW_PENDING=$NEXT_PUBLIC_SHOW_PENDING \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
RUN addgroup -S tamaz && adduser -S tamaz -G tamaz
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=tamaz:tamaz /app/.next/standalone ./
COPY --from=build --chown=tamaz:tamaz /app/.next/static ./.next/static
USER tamaz
EXPOSE 3000
# BACKEND_URL (the backend's private address) is read when the server runs, not when the image is built.
CMD ["node", "server.js"]
