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
    // Wait a bit to ensure Appwrite SDK is loaded
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!window.Appwrite) {
      throw new Error('Appwrite SDK not available');
    }
    
    console.log(`Loading PDF: ${pdfName}`);
    
    // Initialize Appwrite
    const { Client, ID, Storage } = window.Appwrite;
    const client = new Client();
    client
      .setEndpoint('https://syd.cloud.appwrite.io/v1')
      .setProject('68cbce490037c7926659')
      .setKey('standard_15ad54ac81529df9847b63e88b0ac43908c6ef6f8c30f94012ddf92855aae21322344c5c7a847d9dc87aeb9388f530950f3ef03f2c76e53eb99699d06ce949cd32354d907ed7dbd5f74289539d02bf62287467df585674196ac202c790d6b05c9574368b41104f381d1aaecce279a6c16b9cd73dfce671f3e9b9f68049b2ff80');
    
    const storage = new Storage(client);
    const BUCKET_ID = '68cbce7300119ab31e91';
    
    // 1. Fetch PDF from Joget
    const pdfUrl = `https://expense.pratesis.com/jw/web/app/workOrder/resources/${pdfName}`;
    console.log(`Fetching from: ${pdfUrl}`);
    
    let response;
    let corsProxies = [
      `https://cors-anywhere.herokuapp.com/${pdfUrl}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(pdfUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(pdfUrl)}`,
      `https://proxy.cors.sh/${pdfUrl}`
    ];
    
    // Try direct fetch first, then proxies
    try {
      response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('Direct fetch failed');
      console.log('Direct fetch successful');
    } catch (error) {
      console.log('Direct fetch failed, trying CORS proxies...');
      
      for (let i = 0; i < corsProxies.length; i++) {
        try {
          console.log(`Trying proxy ${i + 1}`);
          response = await fetch(corsProxies[i]);
          if (response.ok) {
            console.log(`Proxy ${i + 1} successful!`);
            break;
          }
        } catch (proxyError) {
          console.log(`Proxy ${i + 1} failed`);
          if (i === corsProxies.length - 1) {
            throw new Error('All fetch methods failed');
          }
        }
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to fetch PDF: ${response ? response.statusText : 'No response'}`);
    }

    const pdfBlob = await response.blob();
    const pdfFile = new File([pdfBlob], pdfName, { type: "application/pdf" });

    // 2. Upload to Appwrite Storage
    console.log('Uploading to Appwrite...');
    const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), pdfFile);
    console.log('Upload successful:', uploadedFile.$id);
    
    // 3. Get Appwrite file view URL
    const fileViewUrl = storage.getFileView(BUCKET_ID, uploadedFile.$id);
    console.log('Appwrite file URL:', fileViewUrl.href);
    
    // 4. Load PDF from Appwrite into WebViewer
    await instance.UI.loadDocument(fileViewUrl.href, { filename: pdfName });
    console.log(`Successfully loaded ${pdfName} from Appwrite`);
    
    // 5. Add save and cancel buttons
    instance.UI.setHeaderItems(header => {
      // Save button
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
            
            alert("PDF saved successfully!");
          } catch (error) {
            console.error('Save error:', error);
            alert("Error saving PDF. Please try again.");
          }
        }
      });
      
      // Cancel button
      header.push({
        type: 'actionButton',
        img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" fill="currentColor"/></svg>',
        onClick: async () => {
          const confirmClose = confirm("Close editor? Any unsaved changes will be lost.");
          if (confirmClose) {
            // Clean up temp file from Appwrite
            try {
              await storage.deleteFile(BUCKET_ID, uploadedFile.$id);
              console.log("Temporary file cleaned up");
            } catch (error) {
              console.error("Cleanup error:", error);
            }
            window.close();
          }
        }
      });
    });

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