FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run /etc/nginx/conf.d \
 && chmod -R u+rwX /usr/share/nginx/html /var/cache/nginx /var/run /etc/nginx/conf.d \
 && touch /tmp/nginx.pid && chown nginx:nginx /tmp/nginx.pid
# The nginx:alpine image ships an `nginx` user; do not run workers as root.
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "pid /tmp/nginx.pid; daemon off;"]
