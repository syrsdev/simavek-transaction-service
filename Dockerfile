# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# DATABASE_URL dummy, hanya supaya "prisma generate" tidak error saat build (tidak benar-benar connect ke DB)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate

RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
CMD ["./docker-entrypoint.sh"]