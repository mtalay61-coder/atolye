#!/usr/bin/env bash
KOK="$(cd "$(dirname "$0")" && pwd)"
node "$KOK/oludenetim.js" "${1:-atolye-erp.jsx}"
