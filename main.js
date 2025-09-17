import { joinSession } from "./sessionManager.js";

function initializeViewer() {
  const viewerEl = document.createElement("div");
  viewerEl.id = "viewer";
  viewerEl.style.width = "100%";
  viewerEl.style.height = "100vh";
  return viewerEl;
}

function renderViewer() {
  const root = document.getElementById("root");
  root.innerHTML = "";
  root.appendChild(initializeViewer());

  window.WebViewer({
    path: "WebViewer/lib",
    licenseKey: "demo:1757573550364:6049c1130300000000227036cce126e7ba3206da87acd1c4e561ea9493",
    ui: window.innerWidth < 768 ? "beta" : "default"
  }, document.getElementById("viewer")).then(instance => {
    instance.UI.enableFeatures([
      instance.UI.Feature.FilePicker,
      instance.UI.Feature.ContentEdit
    ]);
    console.log("WebViewer initialized successfully");
  }).catch(error => {
    console.error("Failed to initialize WebViewer:", error);
  });
}

// Mulai app dengan joinSession
function init() {
  joinSession(renderViewer);
}

init();