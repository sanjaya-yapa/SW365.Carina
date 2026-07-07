#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-personal_finance}"
DB_USER="${2:-carina_app}"
DB_PASSWORD="${3:?Database password is required}"
APP_PORT="${4:-3000}"

APP_ROOT="/opt/personal-finance"
APP_DIR="$APP_ROOT/app"
PACKAGE_PATH="/tmp/personal-finance.zip"

if [ ! -f "$PACKAGE_PATH" ]; then
  echo "Application package not found at $PACKAGE_PATH"
  exit 1
fi

apt-get update
apt-get install -y unzip nginx mysql-server

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

mkdir -p "$APP_ROOT"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
unzip -q "$PACKAGE_PATH" -d "$APP_DIR"

systemctl enable mysql
systemctl start mysql

mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

cat > "$APP_DIR/.env" <<EOF
PORT=${APP_PORT}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_CONNECTION_LIMIT=10
EOF

cd "$APP_DIR"
npm ci --omit=dev

mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$APP_DIR/sql/schema.sql"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$APP_DIR/sql/procedures.sql"

cat > /etc/systemd/system/personal-finance.service <<EOF
[Unit]
Description=SW365 Carina Personal Finance Web App
After=network.target mysql.service

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
EOF

chown -R www-data:www-data "$APP_ROOT"
chmod 600 "$APP_DIR/.env"

cat > /etc/nginx/sites-available/personal-finance <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/personal-finance /etc/nginx/sites-enabled/personal-finance

systemctl daemon-reload
systemctl enable personal-finance
systemctl restart personal-finance
nginx -t
systemctl reload nginx

echo "Application installed successfully."
