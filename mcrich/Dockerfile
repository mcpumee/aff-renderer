FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core fonts-thai-tlwg fonts-noto-color-emoji ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs pay.mjs create.mjs extras.mjs video.mjs schedule.mjs chat.mjs auto.mjs backoffice.mjs privacy.mjs viral.mjs samples.mjs linkread.mjs social.mjs film.mjs costs.mjs costreport.mjs admin.mjs schema.sql ./
COPY public ./public
ENV PORT=3200 DATA_DIR=/data/mcrich NODE_ENV=production
EXPOSE 3200
CMD ["node", "server.mjs"]
