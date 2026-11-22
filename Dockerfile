# FlowPay dashboard: build the static app, serve it with NGINX as the browser's single
# origin (docs/deployment.md). Base images are pinned by version and digest.

FROM node:24.18.1-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30.6-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
LABEL org.opencontainers.image.title="FlowPay dashboard" \
      org.opencontainers.image.description="Static dashboard and same-origin API edge for the FlowPay backend"
# The base image's own server block is replaced, not extended.
USER root
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --chown=0:0 --chmod=0444 deploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=0:0 deploy/nginx/flowpay/ /etc/flowpay/
COPY --chown=0:0 deploy/nginx/templates/ /etc/nginx/templates/
COPY --chown=0:0 --from=build /app/dist /usr/share/nginx/html
USER 101
# Backend address as host:port, rendered into the upstream at start. Only FLOWPAY_*
# variables are substituted, so NGINX's own $variables are left alone.
ENV FLOWPAY_API_UPSTREAM=app:8080 \
    NGINX_ENVSUBST_FILTER=^FLOWPAY_
EXPOSE 8080
