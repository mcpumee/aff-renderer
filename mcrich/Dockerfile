FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs schema.sql ./
COPY public ./public
ENV PORT=3200 DATA_DIR=/data/mcrich NODE_ENV=production
EXPOSE 3200
CMD ["node", "server.mjs"]
