#!/usr/bin/env bash
# Stable backend server (no auto-reload). Use while testing upload, auth, chat, etc.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f venv/Scripts/activate ]]; then
  # shellcheck disable=SC1091
  source venv/Scripts/activate
elif [[ -f venv/bin/activate ]]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
fi

exec uvicorn app.main:app --host 127.0.0.1 --port 8000
