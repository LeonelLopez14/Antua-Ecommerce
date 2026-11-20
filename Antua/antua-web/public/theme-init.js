// Tema elegido (stores/themeStore.ts): se aplica antes del primer pintado para que no parpadee.
// Es un archivo aparte (y no un <script> en línea en index.html) para que la Content-Security-Policy
// del proxy pueda prohibir los scripts en línea (script-src 'self', sin 'unsafe-inline').
// Se carga como script clásico, bloqueante y sin defer: tiene que correr antes de pintar.
try {
  var theme = localStorage.getItem('antua.theme')
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.classList.add(theme)
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#151515' : '#FFFBE9')
    })
  }
} catch (error) {}
