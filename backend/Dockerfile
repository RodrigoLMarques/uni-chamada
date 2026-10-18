FROM node:26-alpine AS build
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:26-alpine AS deps
WORKDIR /deps

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:26-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /deps/node_modules ./node_modules
COPY --from=build /build/dist ./dist
COPY package.json ./

USER node

EXPOSE 3000
CMD ["node", "dist/main"]
