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
    // Wait for Appwrite to be available
    let attempts = 0;
    while (!window.AppwriteWeb && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }
    
    if (!window.AppwriteWeb) {
      throw new Error('Appwrite SDK failed to load properly');
    }
    
    console.log(`Loading PDF: ${pdfName}`);
    
    // Initialize Appwrite using the correct API from the documentation
    const { Client, Storage, ID } = window.AppwriteWeb;
    const client = new Client()
      .setEndpoint('https://syd.cloud.appwrite.io/v1')
      .setProject('68cbce490037c7926659');
    
    const storage = new Storage(client);
    const BUCKET_ID = '68cbce7300119ab31e91';
    
    // Try different approaches that might bypass CORS
    const pdfUrl = `https://expense.pratesis.com/jw/web/app/workOrder/resources/${pdfName}`;
    console.log(`Trying to fetch: ${pdfUrl}`);
    
    let pdfBlob = null;
    
    // Method 1: Try fetch with different modes
    const fetchMethods = [
      // Standard fetch
      () => fetch(pdfUrl),
      // No-cors mode (might work but gives opaque response)
      () => fetch(pdfUrl, { mode: 'no-cors' }),
      // With credentials
      () => fetch(pdfUrl, { mode: 'cors', credentials: 'omit' }),
      // XMLHttpRequest approach
      () => new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', pdfUrl, true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve({ ok: true, blob: () => Promise.resolve(xhr.response) });
          } else {
            reject(new Error(`XHR failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('XHR error'));
        xhr.send();
      })
    ];
    
    // Try each method
    for (let i = 0; i < fetchMethods.length; i++) {
      try {
        console.log(`Trying method ${i + 1}...`);
        const response = await fetchMethods[i]();
        
        if (response.ok || response.status === 0) { // status 0 might be no-cors
          pdfBlob = await response.blob();
          if (pdfBlob && pdfBlob.size > 0) {
            console.log(`Method ${i + 1} successful! Blob size: ${pdfBlob.size}`);
            break;
          }
        }
      } catch (error) {
        console.log(`Method ${i + 1} failed:`, error.message);
      }
    }
    
    // If direct methods fail, try CORS proxies
    if (!pdfBlob || pdfBlob.size === 0) {
      console.log('Direct methods failed, trying CORS proxies...');
      
      const corsProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(pdfUrl)}`,
        `https://cors-anywhere.herokuapp.com/${pdfUrl}`,
        `https://corsproxy.io/?${encodeURIComponent(pdfUrl)}`,
        // Try a different approach - some proxies work better with specific headers
        () => fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pdfUrl)}`)
      ];
      
      for (let i = 0; i < corsProxies.length; i++) {
        try {
          console.log(`Trying proxy ${i + 1}...`);
          const proxyUrl = typeof corsProxies[i] === 'string' ? corsProxies[i] : null;
          const response = proxyUrl ? await fetch(proxyUrl) : await corsProxies[i]();
          
          if (response.ok) {
            pdfBlob = await response.blob();
            if (pdfBlob && pdfBlob.size > 0) {
              console.log(`Proxy ${i + 1} successful! Blob size: ${pdfBlob.size}`);
              break;
            }
          }
        } catch (error) {
          console.log(`Proxy ${i + 1} failed:`, error.message);
        }
      }
    }
    
    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error(`All methods failed to fetch ${pdfName}. The file might be protected or require authentication.`);
    }
    
    // Verify it's actually a PDF
    if (!pdfBlob.type.includes('pdf') && pdfBlob.type !== 'application/octet-stream') {
      console.warn('Blob type:', pdfBlob.type, '- might not be a PDF');
    }
    
    const pdfFile = new File([pdfBlob], pdfName, { type: "application/pdf" });

    // Upload to Appwrite Storage
    console.log('Uploading to Appwrite...');
    const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), pdfFile);
    console.log('Upload successful:', uploadedFile.$id);
    
    // Get Appwrite file view URL
    const fileViewUrl = storage.getFileView(BUCKET_ID, uploadedFile.$id);
    console.log('Appwrite file URL:', fileViewUrl.href);
    
    // Load PDF from Appwrite into WebViewer
    await instance.UI.loadDocument(fileViewUrl.href, { filename: pdfName });
    console.log(`Successfully loaded ${pdfName} from Appwrite`);
    
    // Add save and cancel buttons
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