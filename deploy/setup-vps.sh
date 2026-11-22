#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/odystorm}"
DOMAIN="${DOMAIN:-odystorm.auralist.vip}"
API_PORT="${API_PORT:-4410}"
WEB_PORT="${WEB_PORT:-3410}"

echo "==> Provisioning OdyStorm on ${DOMAIN} (API:${API_PORT}, WEB:${WEB_PORT})"

mkdir -p "${APP_DIR}/data"

# 1. Ensure curl, unzip, rsync are installed
if ! command -v rsync >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl unzip rsync ca-certificates
fi

# 2. Ensure Bun >= 1.2 is installed globally at /usr/local/bin/bun
if ! command -v bun >/dev/null 2>&1; then
  echo "==> Installing Bun runtime..."
  curl -fsSL https://bun.sh/install | bash
  ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
  ln -sf "$HOME/.bun/bin/bunx" /usr/local/bin/bunx
fi

# 3. Ensure Node.js >= 20 is installed (used by Next.js build/runtime)
if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
fi

# 4. Initialize persistent .env if not yet created
ENV_FILE="${APP_DIR}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  echo "==> Generating persistent ${ENV_FILE}..."
  GENERATED_SECRET="$(openssl rand -hex 32)"
  cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
API_PORT=${API_PORT}
PORT=${WEB_PORT}
API_INTERNAL_URL=http://127.0.0.1:${API_PORT}
SQLITE_DB_PATH=${APP_DIR}/data/odystorm.db
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
NEXT_PUBLIC_WS_URL=wss://${DOMAIN}/ws
BETTER_AUTH_URL=https://${DOMAIN}
BETTER_AUTH_SECRET=${GENERATED_SECRET}
ADMIN_EMAILS=admin@odystorm.xyz
VAPID_SUBJECT=mailto:ops@${DOMAIN}
EOF
  chmod 600 "${ENV_FILE}"
fi

# 5. Install systemd service units
cat > /etc/systemd/system/odystorm-api.service <<EOF
[Unit]
Description=OdyStorm Bun API & SQLite Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}/apps/api
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/local/bin/bun src/index.ts
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/odystorm-web.service <<EOF
[Unit]
Description=OdyStorm Next.js Web Frontend
After=network.target odystorm-api.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}/apps/web
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/env npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable odystorm-api.service odystorm-web.service

# 6. Configure Reverse Proxy (Nginx or Caddy) non-destructively
if command -v nginx >/dev/null 2>&1; then
  echo "==> Configuring Nginx virtual host for ${DOMAIN}..."
  if [ ! -f "/etc/nginx/sites-available/${DOMAIN}.conf" ] && [ -f "${APP_DIR}/deploy/nginx/odystorm.auralist.vip.conf" ]; then
    sed \
      -e "s/__API_PORT__/${API_PORT}/g" \
      -e "s/__WEB_PORT__/${WEB_PORT}/g" \
      "${APP_DIR}/deploy/nginx/odystorm.auralist.vip.conf" \
      > "/etc/nginx/sites-available/${DOMAIN}.conf"
    ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
  fi
  nginx -t && systemctl reload nginx

  if command -v certbot >/dev/null 2>&1 && [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "==> Requesting Let's Encrypt TLS certificate for ${DOMAIN}..."
    LE_ACCOUNT_ARG=""
    LE_ACCT="$(ls -1 /etc/letsencrypt/accounts/acme-v02.api.letsencrypt.org/directory/ 2>/dev/null | head -n 1 || true)"
    if [ -n "${LE_ACCT}" ]; then
      LE_ACCOUNT_ARG="--account ${LE_ACCT}"
    fi
    certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --redirect ${LE_ACCOUNT_ARG} || echo "WARN: Certbot skipped or deferred; HTTP port 80 remains active."
  fi
elif command -v caddy >/dev/null 2>&1 && [ -f /etc/caddy/Caddyfile ]; then
  if ! grep -q "${DOMAIN}" /etc/caddy/Caddyfile; then
    echo "==> Appending ${DOMAIN} block to /etc/caddy/Caddyfile..."
    cat >> /etc/caddy/Caddyfile <<EOF

${DOMAIN} {
    handle /ws* {
        reverse_proxy 127.0.0.1:${API_PORT}
    }
    handle /api/* {
        reverse_proxy 127.0.0.1:${API_PORT} {
            flush_interval -1
        }
    }
    handle {
        reverse_proxy 127.0.0.1:${WEB_PORT}
    }
}
EOF
    systemctl reload caddy
  fi
fi

echo "==> VPS base setup complete."
