FROM node:22-alpine AS base

# --- Build Next.js ---
FROM base AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Build Game Server ---
FROM base AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ .
RUN npx tsc

# --- Next.js production image ---
FROM base AS frontend
WORKDIR /app
ENV NODE_ENV=production
# standalone output includes only required node_modules
COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static
COPY --from=frontend-builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

# --- Game Server production image ---
# Mirror dev layout: /app/server/dist/index.js reads ../../src/data/cards.json -> /app/src/data/cards.json
FROM base AS gameserver
WORKDIR /app/server
ENV NODE_ENV=production
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./
COPY --from=frontend-builder /app/src/data /app/src/data
EXPOSE 3001
CMD ["node", "dist/index.js"]
