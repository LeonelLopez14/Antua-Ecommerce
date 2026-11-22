/**
 * Equipo modesto: pocos núcleos o poca memoria. Son señales opcionales (`deviceMemory` solo existe en
 * Chromium y `hardwareConcurrency` puede faltar): si el navegador no las da, se asume un equipo normal.
 * Se usa para bajar la densidad de píxeles del 3D, no para quitar contenido.
 */
export function isLowEndDevice(nav: Navigator = navigator): boolean {
  const cores = nav.hardwareConcurrency
  const memory = (nav as Navigator & { deviceMemory?: number }).deviceMemory
  return (typeof cores === 'number' && cores > 0 && cores <= 4) || (typeof memory === 'number' && memory <= 4)
}
