FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm turbo
COPY . .
RUN pnpm install --frozen-lockfile
RUN turbo build --filter=ws-backend...

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./


COPY apps/ws-backend/package.json ./apps/ws-backend/
COPY packages/db/package.json ./packages/db/

COPY packages/backend-common/package.json ./packages/backend-common/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/apps/ws-backend/dist ./apps/ws-backend/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist

COPY --from=builder /app/packages/backend-common/dist ./packages/backend-common/dist


COPY packages/db/prisma ./packages/db/prisma


RUN cd packages/db && npx prisma generate

EXPOSE 8080


CMD ["node", "apps/ws-backend/dist/index.js"]

