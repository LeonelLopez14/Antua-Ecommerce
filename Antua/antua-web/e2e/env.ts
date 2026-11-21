/**
 * Adónde apuntan las pruebas. Por defecto, al entorno de desarrollo (front en :5173, API en :3000).
 * Contra el despliegue de prueba (docker-compose.prod.yml), todo pasa por el proxy:
 *
 *   E2E_BASE_URL=https://localhost:8443 E2E_API_URL=https://localhost:8443/api \
 *   E2E_IGNORE_HTTPS_ERRORS=1 pnpm test:e2e:deploy
 *
 * (ver docs/despliegue.md, "Verificar el despliegue").
 */
export const API = process.env.E2E_API_URL ?? 'http://localhost:3000'
