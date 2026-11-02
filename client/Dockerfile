# FastNumeric Frontend — Multi-stage build
# Stage 1: build React ด้วย Vite
# Stage 2: เสิร์ฟ static files ด้วย Nginx + reverse proxy /api → backend

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
# ใน production ใช้ /api ผ่าน Nginx proxy จึงไม่ต้องกำหนด VITE_API_URL
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
