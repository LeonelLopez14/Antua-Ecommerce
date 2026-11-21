#!/usr/bin/env bash
# Guardia del repo: archivos que nunca se versionan y secretos evidentes.
#
#   ./scripts/check-repo.sh              # revisa todos los archivos versionados
#   ./scripts/check-repo.sh origin/main  # además, solo las líneas agregadas desde origin/main
#
# Lo corre la integración continua (.github/workflows/ci.yml) y se puede correr a mano antes de
# un commit. Sale con código 1 si encuentra algo. No reemplaza a una herramienta dedicada
# (gitleaks, trufflehog): busca lo evidente.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
base=${1:-}
problems=0

# --- 1. Archivos prohibidos ------------------------------------------------------------------
# .env reales (sí: .env.example y .env.prod.example), dependencias, compilados, respaldos,
# volcados, subidas, certificados, claves y reportes HTML pesados.
forbidden='(^|/)\.env$|(^|/)\.env\.(prod|local|test|development|production)$|(^|/)node_modules/|(^|/)dist(-tools)?/|\.sql(\.gz)?$|\.tar\.gz$|(^|/)uploads/|(^|/)(backups|respaldos)/|\.(pem|key|crt|p12|pfx)$|\.report\.html$'
found=$(git ls-files | grep -E "$forbidden" || true)
if [ -n "$found" ]; then
  echo "Archivos que no se deben versionar:"
  printf '  %s\n' $found
  problems=$((problems + 1))
else
  echo "ok: ningún archivo prohibido versionado"
fi

# --- 2. Secretos evidentes -------------------------------------------------------------------
# Claves privadas, tokens con formato conocido (AWS, GitHub, Slack, Google, Mercado Pago de
# producción) y asignaciones de secretos en archivos .env con un valor que no es de ejemplo.
patterns='-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|APP_USR-[0-9]{6,}-[0-9a-f-]{20,}'
env_assign='^[[:space:]]*(JWT_SECRET|[A-Z_]*PASSWORD|MP_ACCESS_TOKEN|MP_WEBHOOK_SECRET)=.+'
# Valores aceptados en plantillas: vacíos, EJEMPLO…, tu_password, reemplazar…
env_placeholder='=(EJEMPLO|tu_password|reemplazar|$)'

if [ -n "$base" ]; then
  echo "Buscando secretos en las líneas agregadas desde $base"
  added=$(git diff --unified=0 "$base"...HEAD | grep -E '^\+[^+]' || true)
  hits=$(printf '%s\n' "$added" | grep -E -- "$patterns" || true)
  env_hits=$(git diff --unified=0 "$base"...HEAD -- '*.env*' '*.env' | grep -E '^\+[^+]' | sed 's/^+//' \
    | grep -E "$env_assign" | grep -vE "$env_placeholder" || true)
else
  echo "Buscando secretos en todos los archivos versionados"
  hits=$(git grep -nIE -- "$patterns" || true)
  env_hits=$(git grep -nIE "$env_assign" -- '*.env*' '*.env' | grep -vE "$env_placeholder" || true)
fi

if [ -n "$hits" ] || [ -n "$env_hits" ]; then
  echo "Posibles secretos:"
  # Se muestra dónde, pero no el valor completo.
  printf '%s\n%s\n' "$hits" "$env_hits" | sed '/^$/d' | cut -c1-80 | sed 's/^/  /'
  problems=$((problems + 1))
else
  echo "ok: sin secretos evidentes"
fi

if [ "$problems" -gt 0 ]; then
  exit 1
fi
