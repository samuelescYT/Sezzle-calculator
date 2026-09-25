# syntax=docker/dockerfile:1

# Build stage: install, test and bundle the app.
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm test && npm run build

# Runtime stage: nginx serves the static files and proxies /api to the backend,
# so the browser talks to a single origin and no CORS is needed.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
