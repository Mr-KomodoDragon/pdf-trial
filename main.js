import { joinSession } from "./sessionManager.js";

function initializeViewer() {
  const viewerEl = document.createElement("div");
  viewerEl.id = "viewer";
  viewerEl.style.width = "100%";
  viewerEl.style.height = "100vh";
  return viewerEl;
}

function renderViewer(pdfUrl) {
  // Jika tidak ada pdfUrl, fallback ke kosong atau error
  if (!pdfUrl) {
    console.error("No PDF URL provided");
    return;
  }

  const root = document.getElementById("root");
  root.innerHTML = "";
  root.appendChild(initializeViewer());

  const options = {
    path: "WebViewer/lib",
    licenseKey: "demo:1757573550364:6049c1130300000000227036cce126e7ba3206da87acd1c4e561ea9493",
    initialDoc: pdfUrl,  // Muat PDF dari URL secara otomatis
    extension: 'pdf',    // Pastikan dikenali sebagai PDF jika URL extensionless
    ui: window.innerWidth < 768 ? "beta" : "default"
  };

  window.WebViewer(options, document.getElementById("viewer")).then(instance => {
    instance.UI.enableFeatures([
      instance.UI.Feature.FilePicker,
      instance.UI.Feature.ContentEdit
    ]);

    // Opsional: Event listener untuk simpan setelah edit
    instance.UI.iframeWindow.addEventListener('updateViewerAnnotations', () => {
      // Contoh: Export PDF setelah ada perubahan
      instance.Core.documentViewer.getDocument().getFileData().then(data => {
        const arr = new Uint8Array(data);
        const blob = new Blob([arr], { type: 'application/pdf' });
        // Kirim blob ke Joget via fetch, misalnya:
        // fetch('/joget/update-workorder', { method: 'POST', body: formDataWithBlob })
        console.log("PDF edited, ready to send back");
      });
    });

    console.log("WebViewer initialized with PDF:", pdfUrl);
  }).catch(error => {
    console.error("Failed to initialize WebViewer:", error);
  });
}

// Modifikasi init: joinSession sekarang pass pdfUrl ke renderViewer
function init() {
  // Ambil pdfUrl dari query param jika joinSession belum handle
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrlFromParam = urlParams.get('file');

  joinSession((sessionData) => {
    // Asumsikan sessionData punya pdfUrl dari Joget, atau gunakan dari param
    const pdfUrl = sessionData?.pdfUrl || pdfUrlFromParam;
    renderViewer(pdfUrl);
  });
}

// Run the app
init();