#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [ ! -f dist/index.html ]; then
  echo 'Build ausente. Execute npm ci e npm run build uma vez com internet.'
  exit 1
fi
printf 'AquaMonitor 3D: abra http://localhost:4174\nUse Ctrl+C para encerrar. Não é necessária internet no modo demonstração.\n'
python3 -m http.server 4174 --bind 127.0.0.1 --directory dist
