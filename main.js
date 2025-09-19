import { joinSession } from "./sessionManager.js";

// --- Function to get URL parameters ---
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
    
    // Check for PDF parameter after WebViewer loads
    const pdfName = getUrlParameter('pdf');
    if (pdfName) {
      console.log(`PDF parameter detected: ${pdfName}`);
      // Simple approach - just try to load the PDF directly
      await loadPdfFromJoget(instance, pdfName);
    }
    
  }).catch(error => {
    console.error("Failed to initialize WebViewer:", error);
  });
}

async function loadPdfFromJoget(instance, pdfName) {
  try {
    console.log(`Loading PDF: ${pdfName}`);
    
    // 1. Try to fetch the PDF directly first
    const pdfUrl = `https://expense.pratesis.com/jw/web/app/workOrder/resources/${pdfName}`;
    console.log(`Fetching from: ${pdfUrl}`);
    
    let response;
    try {
      response = await fetch(pdfUrl);
    } catch (error) {
      console.log('Direct fetch failed, trying with CORS proxy...');
      const corsUrl = `https://cors-anywhere.herokuapp.com/${pdfUrl}`;
      response = await fetch(corsUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const pdfBlob = await response.blob();
    const pdfBlobUrl = URL.createObjectURL(pdfBlob);
    
    // 2. Load the PDF blob directly into WebViewer
    console.log('Loading PDF into WebViewer...');
    await instance.UI.loadDocument(pdfBlobUrl, { filename: pdfName });
    console.log(`Successfully loaded ${pdfName}`);
    
    // 3. Add download button for the loaded PDF
    instance.UI.setHeaderItems(header => {
      header.push({
        type: 'actionButton',
        img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>',
        onClick: async () => {
          try {
            const doc = instance.Core.documentViewer.getDocument();
            const xfdfString = await instance.Core.annotationManager.exportAnnotations();
            const data = await doc.getFileData({ xfdfString });
            const arr = new Uint8Array(data);
            const blob = new Blob([arr], { type: 'application/pdf' });
            
            // Download the edited PDF
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `edited_${pdfName}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            
            alert("PDF downloaded successfully!");
          } catch (error) {
            console.error('Download error:', error);
            alert("Error downloading PDF. Please try again.");
          }
        }
      });
    });
    
    // Clean up the blob URL after loading
    setTimeout(() => {
      URL.revokeObjectURL(pdfBlobUrl);
    }, 5000);

  } catch (error) {
    console.error("Error loading PDF from Joget:", error);
    alert(`Error loading "${pdfName}": ${error.message}. The PDF editor will remain open for you to load files manually.`);
  }
}

// This function will start the entire application
function init() {
  joinSession(renderViewer);
}

// Run the app
init();