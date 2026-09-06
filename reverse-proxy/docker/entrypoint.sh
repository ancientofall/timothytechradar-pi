#!/usr/bin/env bash
set -euo pipefail

mkdir -p /var/www/certbot

if [ "${HTTPS:-false}" = "true" ]; then
  for domain in "$FRONTEND_DOMAIN_NAME" "$BACKEND_DOMAIN_NAME"; do
    for file in fullchain.pem privkey.pem; do
      if [ ! -s "/etc/letsencrypt/live/$domain/$file" ]; then
        echo "Missing certificate file for $domain: $file" >&2
        exit 1
      fi
    done
  done
  template=/nginx-ssl.conf.template
else
  template=/nginx.conf.template
fi

envsubst '$FRONTEND_DOMAIN_NAME $BACKEND_DOMAIN_NAME $DOMAIN_VALIDATION_KEY' \
  < "$template" > /etc/nginx/conf.d/default.conf

nginx -t
exec nginx -g 'daemon off;'
