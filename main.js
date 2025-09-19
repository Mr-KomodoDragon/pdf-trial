import { joinSession } from "./sessionManager.js";
import { fetchPdfFromJoget } from "./reader.js";
import { uploadPdfToAppwrite } from "./uploader.js";

function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

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
  }, document.getElementById("viewer")).then(async instance => {
    instance.UI.enableFeatures([
      instance.UI.Feature.FilePicker,
      instance.UI.Feature.ContentEdit
    ]);
    console.log("WebViewer initialized successfully");

    const pdfName = getUrlParameter("pdf");
    if (pdfName) {
      try {
        // Step 1: fetch from Joget
        const pdfFile = await fetchPdfFromJoget(pdfName);

        // Step 2: upload to Appwrite
        const fileUrl = await uploadPdfToAppwrite(pdfFile);

        // Step 3: load into WebViewer
        await instance.UI.loadDocument(fileUrl, { filename: pdfName });
        console.log(`Loaded ${pdfName} from Appwrite`);

      } catch (err) {
        console.error("Error handling PDF:", err);
        alert(`Failed to load PDF: ${err.message}`);
      }
    }
  }).catch(error => {
    console.error("Failed to initialize WebViewer:", error);
  });
}

function init() {
  joinSession(renderViewer);
}

init();
