FROM node:22-alpine AS build
WORKDIR /app
COPY services/payment-service/package*.json ./
RUN npm ci
COPY services/payment-service/tsconfig.json ./
COPY services/payment-service/src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY services/payment-service/package*.json ./
RUN npm ci --omit=dev
COPY services/payment-service/migrations ./migrations
COPY --from=build /app/dist ./dist
COPY proto/payment.proto ./proto/payment.proto
EXPOSE 8004 50054
CMD ["sh", "-c", "npm run migrate && node dist/index.js"]
