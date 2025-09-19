// uploader.js
export async function uploadPdfToAppwrite(pdfFile) {
  if (!window.AppwriteWeb) {
    throw new Error("Appwrite SDK not loaded");
  }

  const { Client, Storage, ID } = window.AppwriteWeb;
  const client = new Client()
    .setEndpoint("https://syd.cloud.appwrite.io/v1")
    .setProject("68cbce490037c7926659");

  const storage = new Storage(client);
  const BUCKET_ID = "68cbce7300119ab31e91";

  console.log("Uploading to Appwrite...");
  const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), pdfFile);
  console.log("Upload successful:", uploadedFile.$id);

  // Return a download URL (string, not .href)
  return storage.getFileDownload(BUCKET_ID, uploadedFile.$id);
}
