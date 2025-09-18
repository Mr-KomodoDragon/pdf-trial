function getPdfUrl() {
  const params = new URLSearchParams(window.location.search);
  let pdfUrl = params.get("file"); // ?file=...

  if (pdfUrl && pdfUrl.startsWith("/")) {
    // tambahin domain Joget biar jadi absolute URL
    const base = window.location.origin; 
    pdfUrl = base + pdfUrl;
  }
  return pdfUrl;
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
    initialDoc: pdfUrl || undefined
  }, document.getElementById("viewer")).then(instance => {
    instance.UI.enableFeatures([
      instance.UI.Feature.FilePicker,
      instance.UI.Feature.ContentEdit
    ]);

    console.log("✅ PDF loaded:", pdfUrl);
  }).catch(error => {
    console.error("❌ Failed to initialize WebViewer:", error);
  });
}
