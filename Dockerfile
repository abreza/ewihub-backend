FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn config set registry https://mirror-npm.runflare.com/ && \
    sed -i 's|https://registry.yarnpkg.com|https://mirror-npm.runflare.com|g' yarn.lock && \
    sed -i 's|https://registry.npmjs.org|https://mirror-npm.runflare.com|g' yarn.lock && \
    yarn --frozen-lockfile --network-timeout 600000 --verbose 2>&1 | tee /tmp/yarn.log || \
    (echo "=== LAST 50 LINES ===" && tail -50 /tmp/yarn.log && exit 1)

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist
COPY --chown=nestjs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=builder /app/package.json ./

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
