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
      await loadPdfFromJoget(instance, pdfName);
    }
    
  }).catch(error => {
    console.error("Failed to initialize WebViewer:", error);
  });
}

async function loadPdfFromJoget(instance, pdfName) {
  let uploadedFileId = null; // Menyimpan ID file yang diupload untuk dihapus nanti
  
  // Initialize Appwrite
  const { Client, Storage, ID } = window.AppwriteWeb;
  const client = new Client()
    .setEndpoint('https://syd.cloud.appwrite.io/v1')
    .setProject('68cbce490037c7926659');
  const storage = new Storage(client);
  const BUCKET_ID = '68cbce7300119ab31e91';
  
  // --- Fungsi untuk membersihkan file sementara ---
  const cleanupTempFile = async () => {
    if (uploadedFileId) {
      try {
        await storage.deleteFile(BUCKET_ID, uploadedFileId);
        console.log("Temporary file cleaned up:", uploadedFileId);
        uploadedFileId = null; // Kosongkan ID setelah dihapus
      } catch (error) {
        console.error("Failed to clean up file:", error);
      }
    }
  };
  
  // --- Menambahkan listener untuk menutup tab/jendela ---
  window.addEventListener('beforeunload', cleanupTempFile);
  
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
    
    let pdfBlob = null;
    
    const pdfUrl = `https://expense.pratesis.com/jw/web/app/workOrder/resources/${pdfName}`;
    const corsProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(pdfUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(pdfUrl)}`
    ];

    try {
        console.log("Trying all proxies in parallel...");
        const fetchPromises = corsProxies.map(proxy => fetch(proxy));
        const response = await Promise.any(fetchPromises);
        if (response.ok) {
            pdfBlob = await response.blob();
            console.log(`Fastest proxy successful! Blob size: ${pdfBlob.size}`);
        } else {
             throw new Error(`Fastest proxy failed with status: ${response.status}`);
        }
    } catch (error) {
        console.error("All proxies failed:", error);
        // Throw a more specific error to be caught by the outer try-catch block
        throw new Error(`All proxies failed to fetch ${pdfName}.`);
    }

    if (!pdfBlob || pdfBlob.size === 0) {
      // This check is slightly redundant now but kept as a safeguard
      throw new Error(`Could not retrieve PDF blob from any proxy.`);
    }

    const pdfFile = new File([pdfBlob], pdfName, { type: "application/pdf" });

    console.log('Uploading to Appwrite...');
    const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), pdfFile);
    uploadedFileId = uploadedFile.$id;
    console.log('Upload successful:', uploadedFileId);
    
    const fileViewUrl = storage.getFileView(BUCKET_ID, uploadedFileId);
    console.log('Appwrite file URL:', fileViewUrl.href);

    // --- PERBAIKAN: Menangani loading spinner yang macet ---
    let renderTimeout;
    const onDocumentLoaded = () => {
        clearTimeout(renderTimeout); // Batalkan timeout jika render berhasil
        console.log("Proses render dokumen selesai. Menutup loading spinner secara manual.");
        instance.UI.closeElements(['loadingModal']); // Paksa tutup loading spinner
        instance.Core.documentViewer.removeEventListener('documentLoaded', onDocumentLoaded);
    };
    instance.Core.documentViewer.addEventListener('documentLoaded', onDocumentLoaded);
    
    console.log(`Memulai memuat dokumen ke WebViewer...`);
    await instance.UI.loadDocument(fileViewUrl.href, { filename: pdfName });
    console.log(`Panggilan loadDocument selesai. Menunggu render...`);
    
    // Atur timeout untuk mencegah UI terlihat macet
    renderTimeout = setTimeout(() => {
        console.warn("Render PDF memakan waktu lama, menutup loading spinner secara paksa.");
        instance.UI.closeElements(['loadingModal']);
        instance.Core.documentViewer.removeEventListener('documentLoaded', onDocumentLoaded);
    }, 15000); // Tunggu 15 detik

    // Add save and cancel buttons
    instance.UI.setHeaderItems(header => {
      header.push({
        type: 'actionButton',
        img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>',
        onClick: async () => {
          try {
            const doc = instance.Core.documentViewer.getDocument();
            const xfdfString = await instance.Core.annotationManager.exportAnnotations();
            const data = await doc.getFileData({ xfdfString });
            const arr = new Uint8_Array(data);
            const blob = new Blob([arr], { type: 'application/pdf' });
            
            window.removeEventListener('beforeunload', cleanupTempFile);

            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `edited_${pdfName}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            
            alert("PDF saved successfully!");
            await cleanupTempFile(); // Bersihkan file setelah berhasil di-download
            
          } catch (error) {
            console.error('Save error:', error);
            alert("Error saving PDF. Please try again.");
          }
        }
      });
      
      header.push({
        type: 'actionButton',
        img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" fill="currentColor"/></svg>',
        onClick: async () => {
          const confirmClose = confirm("Close editor? Any unsaved changes will be lost.");
          if (confirmClose) {
            window.removeEventListener('beforeunload', cleanupTempFile);
            await cleanupTempFile();
            window.close();
          }
        }
      });
    });

  } catch (error) {
    window.removeEventListener('beforeunload', cleanupTempFile);
    console.error("Error loading PDF from Joget:", error);
    alert(`Error loading "${pdfName}": ${error.message}. The PDF editor will remain open for you to load files manually.`);
  }
}

function init() {
  joinSession(renderViewer);
}

init();

