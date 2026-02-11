# ---- deps (prod+dev deps für build) ----
FROM node:22-alpine AS deps
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS builder
WORKDIR /usr/src/app

# WICHTIG: package*.json auch hier rein, sonst kann npm kein "npm run build"
COPY package.json package-lock.json ./

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime (nur prod deps + dist) ----
FROM node:22-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]
