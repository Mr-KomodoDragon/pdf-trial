import { joinSession } from "./sessionManager.js";

function initializeViewer() {
  const viewerEl = document.createElement("div");
  viewerEl.id = "viewer";
  viewerEl.style.width = "100%";
  viewerEl.style.height = "100vh";
  return viewerEl;
}

function getPdfUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("file"); // ?file=...
}

function renderViewer() {
  const root = document.getElementById("root");
  root.innerHTML = "";
  root.appendChild(initializeViewer());

  const pdfUrl = getPdfUrl();

  window.WebViewer({
    path: "WebViewer/lib",
    licenseKey: "demo:1757573550364:6049c1130300000000227036cce126e7ba3206da87acd1c4e561ea9493",
    ui: window.innerWidth < 768 ? "beta" : "default",
    initialDoc: pdfUrl || undefined  // 👈 kalau ada ?file= pakai itu, kalau tidak tetap kosong
  }, document.getElementById("viewer")).then(instance => {
    instance.UI.enableFeatures([
      instance.UI.Feature.FilePicker,  // 👈 tetap bisa open folder
      instance.UI.Feature.ContentEdit
    ]);

    console.log("WebViewer initialized. PDF loaded:", pdfUrl);
  }).catch(error => {
    console.error("Failed to initialize WebViewer:", error);
  });
}

function init() {
  joinSession(renderViewer);
}

init();
