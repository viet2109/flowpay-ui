# FlowPay dashboard: build the static app, serve it with NGINX as the browser's single
# origin (docs/deployment.md). Base images are pinned by version and digest.

FROM node:24.18.1-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Mainline NGINX: the stable image lagged behind its security releases. The image is
# scanned in CI (npm run scan:image), which fails on a fixable HIGH or CRITICAL finding.
FROM nginxinc/nginx-unprivileged:1.31.7-alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e
LABEL org.opencontainers.image.title="FlowPay dashboard" \
      org.opencontainers.image.description="Static dashboard and same-origin API edge for the FlowPay backend"
USER root
# Alpine security fixes published after the base image was built, and no curl (nothing
# here uses it). The base image's own server block is replaced, not extended.
RUN apk upgrade --no-cache \
 && apk del --no-cache curl \
 && rm -f /etc/nginx/conf.d/default.conf
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
