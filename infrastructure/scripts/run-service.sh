#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/thukyso.vatli365.vn/app"
NVM_DIR="/var/www/thukyso.vatli365.vn/.nvm"

cd "$APP_DIR"
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"

case "${1:-}" in
  api)
    exec node apps/api/dist/main.js
    ;;
  worker)
    exec node apps/worker/dist/main.js
    ;;
  *)
    echo "Usage: $0 {api|worker}" >&2
    exit 64
    ;;
esac
