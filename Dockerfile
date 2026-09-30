# syntax=docker/dockerfile:1

# ---------- dependencias ----------
# NODE_ENV fica fora daqui de proposito: o build precisa das devDependencies
# (typescript, tailwind, postcss). Marcar NODE_ENV=production cedo quebra o build.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Nenhuma env de segredo e necessaria aqui: o projeto nao tem NEXT_PUBLIC_*,
# e connectDB() so le MONGODB_URI em runtime, dentro da funcao.
RUN npm run build

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# HOSTNAME=0.0.0.0 e obrigatorio: sem isso o server.js escuta em localhost
# e o Traefik do Coolify nao alcanca o container.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
