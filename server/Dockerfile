# FastNumeric Backend (Express + SQLite)
FROM node:22-alpine

WORKDIR /app

# ติดตั้ง dependencies ก่อน copy โค้ด (ใช้ประโยชน์จาก layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src
COPY test ./test

# ตำแหน่งไฟล์ SQLite — mount กับ named volume จาก docker-compose
ENV DB_PATH=/data/fastnumeric.sqlite
RUN mkdir -p /data

ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "src/index.js"]
