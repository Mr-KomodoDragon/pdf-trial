import { joinSession } from "./sessionManager.js";

function initializeViewer() {
  const viewerEl = document.createElement("div");
  viewerEl.id = "viewer";
  viewerEl.style.width = "100%";
  viewerEl.style.height = "100vh";
  return viewerEl;
}

function renderViewer(pdfUrl) {
  if (!pdfUrl) {
    console.error("No PDF URL provided");
    return;
  }

  const root = document.getElementById("root");
  root.innerHTML = "";
  root.appendChild(initializeViewer());

  // Fetch PDF sebagai blob untuk mengatasi CORS
  fetch(pdfUrl)
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const options = {
        path: "WebViewer/lib",
        licenseKey: "demo:1757573550364:6049c1130300000000227036cce126e7ba3206da87acd1c4e561ea9493",
        initialDoc: url,  // Gunakan blob URL
        extension: 'pdf',
        ui: window.innerWidth < 768 ? "beta" : "default"
      };

      window.WebViewer(options, document.getElementById("viewer")).then(instance => {
        instance.UI.enableFeatures([
          instance.UI.Feature.FilePicker,
          instance.UI.Feature.ContentEdit
        ]);
        console.log("WebViewer initialized with PDF:", pdfUrl);
      }).catch(error => {
        console.error("Failed to initialize WebViewer:", error);
      });
    })
    .catch(error => {
      console.error("Failed to fetch PDF:", error);
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