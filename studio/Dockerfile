FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
COPY public ./public
ENV PORT=3100 DATA_DIR=/data/studio NODE_ENV=production
EXPOSE 3100
CMD ["node", "server.mjs"]
