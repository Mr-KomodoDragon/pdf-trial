self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Kalau response gagal atau status 0, skip aja
      if (response.status === 0) {
        return response;
      }
      
      // Tambahin header COOP dan COEP
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
      newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }).catch(function(error) {
      console.error('Error di Service Worker:', error);
    })
  );
});

// Pastikan Service Worker siap sebelum reload halaman (buat hindari loop reload)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(function(reg) {
    // Cek kalau cross-origin isolation belum aktif dan SW belum control
    if (!window.crossOriginIsolated && !navigator.serviceWorker.controller) {
      window.location.reload();
    }
  });
}