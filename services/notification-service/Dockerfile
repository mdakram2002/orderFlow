FROM node:22-alpine
WORKDIR /app
COPY services/notification-service/package*.json ./
RUN npm ci --omit=dev
COPY services/notification-service/src ./src
USER node
EXPOSE 8005
CMD ["node", "src/index.js"]
