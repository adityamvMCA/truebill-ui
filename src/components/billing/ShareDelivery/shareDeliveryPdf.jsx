import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";

import api from "../../../services/api";
import DeliveryNoteTemplate from "../../../invoice-templates/DeliveryNoteTemplate";
import { getTenantCompany } from "../../../invoice-templates/tenantCompany";


/* ---------- fetch + normalise the delivery note the same way the list page does ---------- */
async function fetchDeliveryNote(deliveryNoteNumber) {
  const response = await api.deliveryNote.getByNumber(deliveryNoteNumber);

  if (response?.data?.success !== true || !response.data.data) {
    throw new Error(response?.data?.message || "Unable to load delivery note.");
  }

  return response.data.data;
}

/* ---------- off-screen render -> canvas -> PDF ---------- */
async function renderToPdfBlob(note, templateId) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.zIndex = "-1";
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    await new Promise((resolve) => {
      root.render(
        <DeliveryNoteTemplate
          invoice={note}
          templateId={templateId}
          company={getTenantCompany()}
        />,
      );
      // two rAFs: one for React to commit, one for layout/fonts/QR to settle
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const pageEl = host.querySelector(".doc");
    if (!pageEl) throw new Error("Delivery note template failed to render.");

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const paperW = pageEl.offsetWidth; // px, already in docVars' mm->px scale
    const paperH = pageEl.offsetHeight;
    const isLandscape = paperW > paperH;

    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "px",
      format: [paperW, paperH],
      compress: true,
    });

    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      paperW,
      paperH,
    );

    return pdf.output("blob");
  } finally {
    root.unmount();
    host.remove();
  }
}

/* <DeliveryNoteTemplate invoice={...} templateId="dn01" /> matches the
   `invoice` prop name DeliveryNoteTemplate expects — see
   DeliveryNoteTemplate.jsx's own comment. */

/**
 * createDeliveryNotePdf(deliveryNoteNumber, templateId?)
 * Fetches the note, renders it with the chosen (or default) delivery-note
 * template, and resolves with a PDF Blob.
 */
export async function createDeliveryNotePdf(deliveryNoteNumber, templateId) {
  const note = await fetchDeliveryNote(deliveryNoteNumber);
  return renderToPdfBlob(note, templateId || "dn01");
}

/* ---------- native share (Capacitor) ---------- */
/**
 * shareDeliveryNoteFile({ blob, fileName, text, title })
 * Writes the PDF into the app's cache dir and opens the native share
 * sheet. Returns "shared" on success, "saved" if the share sheet itself
 * couldn't be opened but the file was written (caller then falls back to
 * opening WhatsApp/Gmail directly, same as sharePdf.js's invoice flow).
 */
export async function shareDeliveryNoteFile({ blob, fileName, text, title }) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const base64 = await blobToBase64(blob);

  await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  const { uri } = await Filesystem.getUri({
    path: fileName,
    directory: Directory.Cache,
  });

  try {
    await Share.share({
      title: title || fileName,
      text,
      url: uri,
      dialogTitle: "Share delivery note",
    });
    return "shared";
  } catch (error) {
    if (error?.message?.toLowerCase().includes("cancel")) {
      throw { name: "AbortError" };
    }
    // File is on disk even if the native sheet failed to open.
    return "saved";
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}