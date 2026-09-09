FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-alpine AS classroom
WORKDIR /app
ENV NODE_ENV=production FOREST_ROOM_HOST=0.0.0.0 FOREST_ROOM_DIR=/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["./node_modules/.bin/tsx", "server/index.ts"]
FROM caddy:2-alpine AS web
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
