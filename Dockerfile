# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS build
WORKDIR /app

# better-sqlite3 needs a toolchain to build its native binding on Alpine
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0

COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --omit=dev

# Built client (Vite) and server sources (executed via tsx in prod)
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
# server/services/trip-suggestions.ts imports src/data/airports.json at runtime
COPY --from=build /app/src/data ./src/data

EXPOSE 3001
CMD ["npm", "start"]
