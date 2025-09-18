import { joinSession } from "./sessionManager.js";

function getPdfUrlFromQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileParam = urlParams.get('file');
  if (fileParam) {
    // Decode if URL-encoded (e.g., from Joget link)
    return decodeURIComponent(fileParam);
  }
  return null; // Or set a default PDF URL if needed
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

  const pdfUrl = getPdfUrlFromQuery();

  window.WebViewer({
    path: "WebViewer/lib",
    licenseKey: "demo:1757573550364:6049c1130300000000227036cce126e7ba3206da87acd1c4e561ea9493",
    // Optionally preload the document here if always known, but dynamic is better for query params
    // initialDoc: pdfUrl ? pdfUrl : undefined,
    ui: window.innerWidth < 768 ? "beta" : "default"
  }, document.getElementById("viewer")).then(instance => {
    instance.UI.enableFeatures([
      instance.UI.Feature.FilePicker,
      instance.UI.Feature.ContentEdit
    ]);

    // Load the PDF from the Joget URL (or query param)
    if (pdfUrl) {
      instance.UI.loadDocument(pdfUrl, {
        // Optional loading options: e.g., specify extension if URL lacks .pdf
        extension: 'pdf',
        // If you want to start on a specific page (e.g., where form fields are)
        // pageNumber: 1,
        // For password-protected PDFs (if applicable)
        // password: 'your-password',
        // With: { documentId: 'unique-id' } for multi-tab syncing if needed
      }).then(() => {
        console.log("PDF loaded successfully from:", pdfUrl);
        // Optional: Focus on a specific form field after loading (e.g., if Joget passes ?field=field1)
        const fieldName = new URLSearchParams(window.location.search).get('field');
        if (fieldName) {
          setTimeout(() => {
            const field = instance.Core.documentViewer.getFormField(fieldName);
            if (field) {
              instance.Core.documentViewer.setCurrentField(field);
              instance.UI.setToolbarGroup('toolbarGroup-Edit'); // Switch to edit mode if needed
            }
          }, 1000); // Delay to ensure document is fully rendered
        }
      }).catch(error => {
        console.error("Failed to load PDF:", error);
        // Fallback: Show a message or load a default PDF
      });
    } else {
      console.warn("No PDF URL provided in query params. Please pass ?file=URL");
      // Optional: Load a default local PDF, e.g., instance.UI.loadDocument('default.pdf');
    }

    console.log("WebViewer initialized successfully");
  }).catch(error => {
    console.error("Failed to initialize WebViewer:", error);
  });
}

// This function will start the entire application
function init() {
  joinSession(renderViewer);
}

// Run the app
init();