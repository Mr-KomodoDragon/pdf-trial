import { joinSession } from "./sessionManager.js";
import { ID, storage } from "./appwriteConfig.js"; // Import Appwrite modules

// --- Helper function to display loading/error states ---
function showStatus(message) {
    const root = document.getElementById("root");
    root.innerHTML = `<div class="lobby">
        <div class="lobby-card">
            <div class="lobby-title">${message}</div>
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
  document.getElementById("root").appendChild(viewerEl);
  return viewerEl;
}

async function renderViewer() {
    const root = document.getElementById("root");
    root.innerHTML = ""; // Clear the root element

    // Get PDF name from URL parameter
    const pdfName = getUrlParameter('pdf');
    
    // Construct PDF URL based on parameter or use default
    let pdfUrl;
    if (pdfName) {
        pdfUrl = `https://expense.pratesis.com/jw/web/app/workOrder/resources/${pdfName}`;
        console.log(`Loading PDF from Joget: ${pdfName}`);
    } else {
        // Use a public PDF as default (Adobe PDF sample that's publicly accessible)
        pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        console.log('Loading default public PDF');
    }

    const BUCKET_ID = '68cbce7300119ab31e91'; // <-- Your Appwrite Storage Bucket ID
    let uploadedFileId = null; // Track uploaded file for cleanup

    try {
        // 1. Show a loading message
        showStatus(`⏳ Fetching document: ${pdfName || 'Default PDF'}...`);

        // 2. Fetch the PDF from the constructed URL
        const response = await fetch(pdfUrl);
        if (!response.ok) {
            // If direct fetch fails, try alternative public PDFs
            if (!pdfName) {
                console.log('Default PDF failed, trying alternative...');
                // Try alternative public PDF sources
                const alternativeUrls = [
                    'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf',
                    'https://www.learningcontainer.com/wp-content/uploads/2019/09/sample-pdf-file.pdf',
                    'https://www.africau.edu/images/default/sample.pdf'
                ];
                
                let pdfBlob = null;
                for (const altUrl of alternativeUrls) {
                    try {
                        const altResponse = await fetch(altUrl);
                        if (altResponse.ok) {
                            pdfBlob = await altResponse.blob();
                            pdfUrl = altUrl; // Update for file naming
                            break;
                        }
                    } catch (altError) {
                        console.log(`Alternative URL ${altUrl} also failed:`, altError);
                    }
                }
                
                if (!pdfBlob) {
                    throw new Error('All default PDF sources failed to load');
                }
                var pdfFile = new File([pdfBlob], "sample-document.pdf", { type: "application/pdf" });
            } else {
                // For Joget files, try with CORS proxy
                const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${pdfUrl}`;
                console.log('Direct fetch failed, trying with CORS proxy...');
                const corsResponse = await fetch(corsProxyUrl);
                if (!corsResponse.ok) {
                    throw new Error(`Failed to fetch PDF "${pdfName}": ${corsResponse.statusText}`);
                }
                const pdfBlob = await corsResponse.blob();
                var pdfFile = new File([pdfBlob], pdfName, { type: "application/pdf" });
            }
        } else {
            const pdfBlob = await response.blob();
            var pdfFile = new File([pdfBlob], pdfName || "sample-document.pdf", { type: "application/pdf" });
        }

        // 3. Upload the file to Appwrite Storage
        showStatus("🚀 Uploading to secure storage...");
        const uploadedFile = await storage.createFile(
            BUCKET_ID,
            ID.unique(), // Creates a unique ID for the file
            pdfFile
        );
        
        uploadedFileId = uploadedFile.$id; // Store for potential cleanup
        console.log("File uploaded to Appwrite:", uploadedFile);

        // 4. Get a URL to view the file from Appwrite
        const fileViewUrl = storage.getFileView(BUCKET_ID, uploadedFile.$id);
        console.log("Appwrite file URL:", fileViewUrl.href);
        
        // 5. Initialize WebViewer and load the document from Appwrite
        showStatus("🎨 Rendering PDF editor...");
        const viewerElement = initializeViewer();
        
        WebViewer({
            path: "WebViewer/lib",
            licenseKey: "demo:1757573550364:6049c1130300000000227036cce126e7ba3206da87acd1c4e561ea9493",
            initialDoc: fileViewUrl.href, // Load the document from Appwrite
            ui: window.innerWidth < 768 ? "beta" : "default"
        }, viewerElement).then(instance => {
            instance.UI.enableFeatures([
                instance.UI.Feature.FilePicker,
                instance.UI.Feature.ContentEdit
            ]);
            console.log("WebViewer initialized successfully with Appwrite file.");
            
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
                    
                    // Create download link
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = pdfName || 'edited-document.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    alert("PDF downloaded successfully!");
                  } catch (error) {
                    console.error('Save error:', error);
                    alert("Error saving PDF. Please try again.");
                  }
                }
              });
              
              // Add cancel/close button
              header.push({
                type: 'actionButton',
                img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" fill="currentColor"/></svg>',
                onClick: async () => {
                  const confirmClose = confirm("Are you sure you want to close? Any unsaved changes will be lost.");
                  if (confirmClose) {
                    // Clean up the temporary file from Appwrite
                    if (uploadedFileId) {
                      try {
                        await storage.deleteFile(BUCKET_ID, uploadedFileId);
                        console.log("Temporary file cleaned up from Appwrite");
                      } catch (error) {
                        console.error("Error cleaning up temporary file:", error);
                      }
                    }
                    // Close the tab or redirect back
                    window.close();
                  }
                }
              });
            });
            
            // Handle browser close/refresh to cleanup temp files
            window.addEventListener('beforeunload', async (e) => {
              if (uploadedFileId) {
                // Note: This might not always work due to browser restrictions
                // but it's worth trying for cleanup
                navigator.sendBeacon('/cleanup', JSON.stringify({
                  bucketId: BUCKET_ID,
                  fileId: uploadedFileId
                }));
              }
            });
        });

    } catch (error) {
        console.error("An error occurred:", error);
        const errorMessage = pdfName 
            ? `❌ Error loading "${pdfName}": ${error.message}. Please check if the file exists.`
            : `❌ An error occurred: ${error.message}. Please check the console.`;
        showStatus(errorMessage);
        
        // If we uploaded a file but failed later, clean it up
        if (uploadedFileId) {
            try {
                await storage.deleteFile(BUCKET_ID, uploadedFileId);
                console.log("Cleaned up failed upload");
            } catch (cleanupError) {
                console.error("Error during cleanup:", cleanupError);
            }
        }
    }
}

// This function will start the entire application
function init() {
  // Check if we have a PDF parameter
  const pdfParam = getUrlParameter('pdf');
  if (pdfParam) {
    console.log(`Starting PDF editor for: ${pdfParam}`);
  } else {
    console.log('Starting PDF editor with default document');
  }
  
  joinSession(renderViewer);
}

// Run the app
init();