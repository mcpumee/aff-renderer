FROM node:22-bookworm-slim
# ไลบรารีที่ Chrome (Remotion) ต้องใช้ + ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg ca-certificates libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 \
    libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 \
    libpango-1.0-0 libcairo2 libcups2 fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npx remotion browser ensure
COPY src ./src
COPY server ./server
ENV PORT=3000 DATA_DIR=/data NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/server.mjs"]
