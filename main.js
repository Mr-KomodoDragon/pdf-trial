import { joinSession } from "./sessionManager.js";
import { ID, storage } from "./appwriteConfig.js"; // Import Appwrite modules

// --- Helper function to display loading/error states ---
function showStatus(message) {
    const root = document.getElementById("root");
    root.innerHTML = `<div style="
        display: flex; 
        justify-content: center; 
        align-items: center; 
        height: 100vh; 
        font-family: Arial, sans-serif;
        background: #f5f5f5;
    ">
        <div style="
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        ">
            <div style="font-size: 18px; color: #333;">${message}</div>
        </div>
    </div>`;
}

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

async function renderViewer() {
  const root = document.getElementById("root");
  root.innerHTML = "";

  // Get PDF name from URL parameter
  const pdfName = getUrlParameter('pdf');
  
  // If we have a PDF parameter, load it from your Joget system
  if (pdfName) {
    await loadPdfFromJoget(pdfName);
  } else {
    // Original behavior - just load WebViewer without a specific document
    loadDefaultViewer();
  }
}

async function loadPdfFromJoget(pdfName) {
  const BUCKET_ID = '68cbce7300119ab31e91'; // Your Appwrite Storage Bucket ID
  let uploadedFileId = null;

  try {
    // 1. Show loading message
    showStatus(`⏳ Loading ${pdfName}...`);

    // 2. Construct URL and fetch PDF
    const pdfUrl = `https://expense.pratesis.com/jw/web/app/workOrder/resources/${pdfName}`;
    console.log(`Fetching PDF from: ${pdfUrl}`);
    
    let response = await fetch(pdfUrl);
    if (!response.ok) {
      // Try with CORS proxy
      const corsUrl = `https://cors-anywhere.herokuapp.com/${pdfUrl}`;
      response = await fetch(corsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
    }

    const pdfBlob = await response.blob();
    const pdfFile = new File([pdfBlob], pdfName, { type: "application/pdf" });

    // 3. Upload to Appwrite
    showStatus("🚀 Uploading to storage...");
    const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), pdfFile);
    uploadedFileId = uploadedFile.$id;
    
    // 4. Get view URL
    const fileViewUrl = storage.getFileView(BUCKET_ID, uploadedFile.$id);

    // 5. Initialize WebViewer with the document
    showStatus("🎨 Loading PDF editor...");
    const viewerEl = initializeViewer();
    document.getElementById("root").appendChild(viewerEl);

    window.WebViewer({
      path: "WebViewer/lib",
      licenseKey: "demo:1757573550364:6049c1130300000000227036cce126e7ba3206da87acd1c4e561ea9493",
      initialDoc: fileViewUrl.href,
      ui: window.innerWidth < 768 ? "beta" : "default"
    }, document.getElementById("viewer")).then(instance => {
      instance.UI.enableFeatures([
        instance.UI.Feature.FilePicker,
        instance.UI.Feature.ContentEdit
      ]);
      
      // Add save button
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
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `edited_${pdfName}`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              alert("PDF saved successfully!");
            } catch (error) {
              console.error('Save error:', error);
              alert("Error saving PDF. Please try again.");
            }
          }
        });
        
        // Add cancel button
        header.push({
          type: 'actionButton',
          img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" fill="currentColor"/></svg>',
          onClick: async () => {
            const confirmClose = confirm("Close editor? Unsaved changes will be lost.");
            if (confirmClose) {
              // Clean up temp file
              if (uploadedFileId) {
                try {
                  await storage.deleteFile(BUCKET_ID, uploadedFileId);
                  console.log("Temp file cleaned up");
                } catch (error) {
                  console.error("Cleanup error:", error);
                }
              }
              window.close();
            }
          }
        });
      });
      
      console.log("WebViewer initialized successfully with document:", pdfName);
    }).catch(error => {
      console.error("Failed to initialize WebViewer:", error);
      showStatus(`❌ Error initializing PDF editor: ${error.message}`);
    });

  } catch (error) {
    console.error("Error loading PDF from Joget:", error);
    showStatus(`❌ Error loading "${pdfName}": ${error.message}`);
    
    // Cleanup on error
    if (uploadedFileId) {
      try {
        await storage.deleteFile(BUCKET_ID, uploadedFileId);
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
    }
  }
}

function loadDefaultViewer() {
  // Your original behavior - load WebViewer without a document
  const viewerEl = initializeViewer();
  document.getElementById("root").appendChild(viewerEl);

  window.WebViewer({
    path: "WebViewer/lib",
    licenseKey: "demo:1757573550364:6049c1130300000000227036cce126e7ba3206da87acd1c4e561ea9493",
    ui: window.innerWidth < 768 ? "beta" : "default"
  }, document.getElementById("viewer")).then(instance => {
    instance.UI.enableFeatures([
      instance.UI.Feature.FilePicker,
      instance.UI.Feature.ContentEdit
    ]);
    console.log("WebViewer initialized successfully (default mode)");
  }).catch(error => {
    console.error("Failed to initialize WebViewer:", error);
    showStatus(`❌ Error initializing PDF editor: ${error.message}`);
  });
}

// This function will start the entire application
function init() {
  const pdfParam = getUrlParameter('pdf');
  if (pdfParam) {
    console.log(`Loading PDF: ${pdfParam}`);
  } else {
    console.log('Loading default viewer');
  }
  
  joinSession(renderViewer);
}

// Run the app
init();