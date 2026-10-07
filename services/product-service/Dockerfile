FROM node:22-alpine AS build
WORKDIR /app
COPY services/product-service/package*.json ./
RUN npm ci
COPY services/product-service/tsconfig.json ./
COPY services/product-service/src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY services/product-service/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY proto/product.proto ./proto/product.proto
EXPOSE 8002 50052
CMD ["node", "dist/index.js"]
