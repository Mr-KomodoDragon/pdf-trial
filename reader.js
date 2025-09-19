// reader.js
export async function fetchPdfFromJoget(pdfName) {
  const pdfUrl = `https://expense.pratesis.com/jw/web/app/workOrder/resources/${pdfName}`;
  console.log("Fetching PDF:", pdfUrl);

  const response = await fetch(pdfUrl);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  
  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error("Empty PDF blob");

  console.log(`Fetched PDF blob size: ${blob.size}`);
  return new File([blob], pdfName, { type: "application/pdf" });
}
