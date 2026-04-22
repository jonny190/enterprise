FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Isolated Prisma CLI installation with full transitive deps for runtime migrations.
# Installing here (rather than copying node_modules/prisma) ensures deps like
# valibot that Prisma's CLI requires at runtime are present.
RUN mkdir -p /app/migrator && cd /app/migrator \
    && npm init -y >/dev/null \
    && npm install prisma@7.5.0 --no-save --no-audit --no-fund --loglevel=error
COPY --from=builder /app/prisma /app/migrator/prisma
COPY --from=builder /app/prisma.config.ts /app/migrator/prisma.config.ts

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["docker-entrypoint.sh"]
