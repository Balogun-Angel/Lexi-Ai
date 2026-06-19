#!/usr/bin/env bash
# Backend with hot reload — watches backend/app only (not venv or uploads).
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f venv/Scripts/activate ]]; then
  # shellcheck disable=SC1091
  source venv/Scripts/activate
elif [[ -f venv/bin/activate ]]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
fi

exec uvicorn app.main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --reload \
  --reload-dir app \
  --reload-exclude '*/__pycache__/*'
