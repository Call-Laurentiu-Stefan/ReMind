import { useState } from "react";
import { fetchWithRefresh } from "../../scripts/fetchWithRefresh";

const DownloadButton = ({ link, title, authToken }) => {
  const [format, setFormat] = useState("html");

  const handleDownload = async (e) => {
    e.stopPropagation();

    try {
      if (format === "html") {
        const response = await fetchWithRefresh(
          `bookmarks/download?url=${encodeURIComponent(link)}`,
          authToken,
          "GET"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch webpage content");
        }

        const htmlContent = await response.text();
        const blob = new Blob([htmlContent], { type: "text/html" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${title || "bookmark"}.html`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
      } else if (format === "pdf") {
        const pdfResponse = await fetchWithRefresh(
          "bookmarks/generate-pdf",
          authToken,
          "POST",
          { url: link, title: title || "bookmark" }
        );

        if (!pdfResponse.ok) {
          throw new Error("Failed to generate PDF");
        }

        const pdfBlob = await pdfResponse.blob();
        const pdfURL = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = pdfURL;
        downloadLink.download = `${title || "bookmark"}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(pdfURL);
      }
    } catch (error) {
      console.error("Error downloading the webpage:", error);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <span onClick={handleDownload} style={{ cursor: "pointer" }}>
        Download
      </span>
      <select
        className="custom-select"
        value={format}
        onChange={(e) => setFormat(e.target.value)}
      >
        <option value="html">HTML</option>
        <option value="pdf">PDF</option>
      </select>
    </div>
  );
};

export default DownloadButton;
