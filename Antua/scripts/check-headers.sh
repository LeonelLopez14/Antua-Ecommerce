#!/bin/sh
# Revisa las cabeceras de seguridad, caché y compresión del sitio servido por Caddy.
#
#   ./scripts/check-headers.sh https://localhost:8443
#   ./scripts/check-headers.sh https://tienda.tu-dominio.com --hsts
#
# Opciones:
#   --hsts       exige Strict-Transport-Security (modo public). Sin la opción, exige que NO esté
#                (modo internal: HSTS solo con un dominio real).
# Variables:
#   CURL_OPTS    opciones extra de curl. Con el certificado interno de Caddy:
#                CURL_OPTS="--cacert caddy-root.crt"   (Windows: agregá --ssl-no-revoke)
#
# Sale con código 1 si algo no cumple, así sirve también en un script de verificación.
set -eu

base=${1:?Uso: check-headers.sh <URL base> [--hsts]}
base=${base%/}
want_hsts=no
[ "${2:-}" = "--hsts" ] && want_hsts=yes
curl_opts=${CURL_OPTS:-}
failures=0

# Cabeceras de una URL (GET, cuerpo descartado). $2: Accept-Encoding opcional.
headers() {
  # shellcheck disable=SC2086
  curl -sS -o /dev/null -D - $curl_opts ${2:+-H "Accept-Encoding: $2"} "$1" | tr -d '\r'
}

# check <descripción> <cabeceras> <regex extendida, sin distinguir mayúsculas>
check() {
  if printf '%s\n' "$2" | grep -Eqi "$3"; then
    printf '  ok    %s\n' "$1"
  else
    printf '  FALLA %s (se esperaba: %s)\n' "$1" "$3"
    failures=$((failures + 1))
  fi
}

# check_absent <descripción> <cabeceras> <regex>
check_absent() {
  if printf '%s\n' "$2" | grep -Eqi "$3"; then
    printf '  FALLA %s (no debería estar: %s)\n' "$1" "$3"
    failures=$((failures + 1))
  else
    printf '  ok    %s\n' "$1"
  fi
}

echo "Página (index.html): $base/"
h=$(headers "$base/" "zstd, gzip")
check "200" "$h" '^HTTP/[0-9.]+ 200'
check "Content-Security-Policy sin unsafe-inline/eval" "$h" "^content-security-policy: default-src 'self'; script-src 'self';"
check_absent "CSP sin 'unsafe-inline'" "$(printf '%s\n' "$h" | grep -i '^content-security-policy')" "unsafe-inline|unsafe-eval"
check "frame-ancestors 'none'" "$h" "^content-security-policy:.*frame-ancestors 'none'"
check "X-Content-Type-Options" "$h" '^x-content-type-options: nosniff'
check "Referrer-Policy" "$h" '^referrer-policy: strict-origin-when-cross-origin'
check "Permissions-Policy" "$h" '^permissions-policy: .*camera=\(\)'
check "X-Frame-Options" "$h" '^x-frame-options: deny'
check "index.html sin caché" "$h" '^cache-control: no-cache'
check "comprimido (zstd o gzip)" "$h" '^content-encoding: (zstd|gzip)'
check_absent "sin header Server" "$h" '^server:'
if [ "$want_hsts" = yes ]; then
  check "HSTS (modo public), sin preload" "$h" '^strict-transport-security: max-age=31536000$'
else
  check_absent "sin HSTS (modo internal)" "$h" '^strict-transport-security:'
fi

echo "Ruta de la SPA: $base/tienda"
h=$(headers "$base/tienda")
check "200 con index.html (fallback)" "$h" '^content-type: text/html'

# Primer archivo con hash que referencia index.html. Se baja entero antes de buscar: con
# `curl | head` el pipe se corta y curl avisa un error de escritura.
# shellcheck disable=SC2086
html=$(curl -sS $curl_opts "$base/")
asset=$(printf '%s\n' "$html" | grep -oE '/assets/[^"]+\.js' | head -n 1)
echo "Archivo con hash: $base$asset"
h=$(headers "$base$asset" "gzip")
check "caché de un año e inmutable" "$h" '^cache-control: public, max-age=31536000, immutable'
check "JavaScript" "$h" '^content-type: (text|application)/javascript'

echo "Archivo inexistente en /assets: 404 (nunca index.html)"
h=$(headers "$base/assets/no-existe-$$.js")
check "404" "$h" '^HTTP/[0-9.]+ 404'

echo "API por el proxy: $base/api/health"
h=$(headers "$base/api/health")
check "200" "$h" '^HTTP/[0-9.]+ 200'
check "JSON" "$h" '^content-type: application/json'
check "nosniff (helmet)" "$h" '^x-content-type-options: nosniff'

if [ -n "${UPLOAD_PATH:-}" ]; then
  echo "Imagen subida: $base$UPLOAD_PATH"
  h=$(headers "$base$UPLOAD_PATH")
  check "200" "$h" '^HTTP/[0-9.]+ 200'
  check "caché de un año e inmutable" "$h" '^cache-control: public, max-age=31536000, immutable'
  check "CSP propia de la API (sandbox)" "$h" "^content-security-policy: default-src 'none'; sandbox"
fi

if [ "$failures" -gt 0 ]; then
  echo "Resultado: $failures cabecera(s) no cumplen."
  exit 1
fi
echo "Resultado: todo cumple."
