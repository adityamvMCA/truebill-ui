import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";

/* ------------------------------------------------------------------ */
/* Config: adjust to your data                                          */
/* ------------------------------------------------------------------ */

const COMPANY_NAME = "TrustIQ";

/* Line item field names differ between projects. Add yours here. */
const getItems = (inv) =>
  inv.items || inv.lineItems || inv.products || inv.lines || [];

const itemName = (it) =>
  it.productName || it.name || it.description || it.itemName || "";
const itemQty = (it) => Number(it.quantity ?? it.qty ?? 0);
const itemRate = (it) =>
  Number(it.ratePaise ?? it.unitPricePaise ?? it.pricePaise ?? 0);
const itemAmount = (it) =>
  Number(
    it.amountPaise ??
      it.totalPaise ??
      it.lineTotalPaise ??
      itemQty(it) * itemRate(it),
  );

/* ------------------------------------------------------------------ */
/* Helpers (jsPDF's built-in fonts cannot draw the rupee sign)          */
/* ------------------------------------------------------------------ */

const rs = (paise) =>
  `Rs. ${((Number(paise) || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dt = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "N/A"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

/* ------------------------------------------------------------------ */
/* Load the full invoice                                                */
/* ------------------------------------------------------------------ */

const loadInvoice = async (invoiceNumber) => {
  const response = await salesInvoiceApi.getByNumber(invoiceNumber);
  const body = response?.data;

  const invoice =
    body?.invoice ||
    body?.data?.invoice ||
    (body?.data?.invoiceNumber ? body.data : null) ||
    (body?.invoiceNumber ? body : null);

  if (!invoice || invoice.invoiceNumber !== invoiceNumber) {
    throw new Error("Unable to load the invoice for the PDF.");
  }

  return invoice;
};

/* ------------------------------------------------------------------ */
/* Build the PDF                                                        */
/* ------------------------------------------------------------------ */

export const buildInvoicePdf = (inv) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const right = pageWidth - margin;

  /* Header */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(COMPANY_NAME, margin, 52);

  doc.setFontSize(16);
  doc.text("TAX INVOICE", right, 52, { align: "right" });

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, 66, right, 66);

  /* Invoice meta */
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: ${inv.invoiceNumber}`, right, 86, { align: "right" });
  doc.text(`Date: ${dt(inv.invoiceDate)}`, right, 100, { align: "right" });
  doc.text(`Due Date: ${dt(inv.dueDate)}`, right, 114, { align: "right" });
  doc.text(`Terms: ${inv.paymentTerms || "N/A"}`, right, 128, {
    align: "right",
  });

  /* Bill to */
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", margin, 86);
  doc.setFont("helvetica", "normal");

  const billTo = [
    inv.customerName,
    inv.customerCode ? `Code: ${inv.customerCode}` : "",
    inv.customerGstNo ? `GSTIN: ${inv.customerGstNo}` : "",
    ...(inv.billingAddress
      ? doc.splitTextToSize(String(inv.billingAddress), 240)
      : []),
  ].filter(Boolean);

  doc.text(billTo, margin, 100);

  /* Items */
  const items = getItems(inv);

  autoTable(doc, {
    startY: 150 + Math.max(0, billTo.length - 4) * 12,
    margin: { left: margin, right: margin },
    head: [["#", "Item", "Qty", "Rate", "Amount"]],
    body: items.length
      ? items.map((it, i) => [
          i + 1,
          itemName(it),
          itemQty(it),
          rs(itemRate(it)),
          rs(itemAmount(it)),
        ])
      : [["", "Invoice amount", "", "", rs(inv.taxableAmountPaise)]],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { halign: "right", cellWidth: 50 },
      3: { halign: "right", cellWidth: 90 },
      4: { halign: "right", cellWidth: 100 },
    },
  });

  /* Totals */
  const totals = [["Taxable Amount", rs(inv.taxableAmountPaise)]];

  if (Number(inv.discountAmountPaise) > 0) {
    totals.unshift(["Discount", `- ${rs(inv.discountAmountPaise)}`]);
  }
  if (Number(inv.cgstAmountPaise) > 0) {
    totals.push(["CGST", rs(inv.cgstAmountPaise)]);
  }
  if (Number(inv.sgstAmountPaise) > 0) {
    totals.push(["SGST", rs(inv.sgstAmountPaise)]);
  }
  if (Number(inv.igstAmountPaise) > 0) {
    totals.push(["IGST", rs(inv.igstAmountPaise)]);
  }

  totals.push(["Total", rs(inv.totalAmountPaise)]);

  if (inv.status === "POSTED") {
    totals.push(["Paid", rs(inv.paidAmountPaise)]);
    totals.push(["Balance Due", rs(inv.outstandingAmountPaise)]);
  }

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    margin: { left: pageWidth - margin - 240, right: margin },
    body: totals,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      const label = totals[data.row.index][0];
      if (label === "Total" || label === "Balance Due") {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  /* Notes and footer */
  let y = doc.lastAutoTable.finalY + 28;

  if (inv.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(String(inv.notes), pageWidth - margin * 2), margin, y + 14);
    y += 40;
  }

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Thank you for your business.", margin, y + 10);
  doc.text("This is a computer-generated invoice.", margin, y + 24);

  return doc.output("blob");
};

export const createInvoicePdf = async (invoiceNumber) => {
  const invoice = await loadInvoice(invoiceNumber);
  return buildInvoicePdf(invoice);
};

/* ------------------------------------------------------------------ */
/* Share / download                                                     */
/* ------------------------------------------------------------------ */

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Unable to read the PDF."));
    reader.readAsDataURL(blob);
  });

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const abortError = () => {
  const error = new Error("Sharing cancelled.");
  error.name = "AbortError";
  return error;
};

/* Returns "shared" or "downloaded". Throws AbortError if the user cancels. */
export const shareInvoiceFile = async ({ blob, fileName, text, title }) => {
  /* Capacitor (Android / iOS): native share sheet with the real file */
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: fileName,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    });

    try {
      await Share.share({
        title,
        text,
        files: [written.uri],
        dialogTitle: "Send invoice",
      });
      return "shared";
    } catch (error) {
      if (/cancel/i.test(String(error?.message))) throw abortError();
      throw error;
    }
  }

  /* Mobile browsers and some desktop browsers: Web Share with a file */
  const file = new File([blob], fileName, { type: "application/pdf" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") throw abortError();
      throw error;
    }
  }

  /* Fallback: download so the user can attach it */
  downloadBlob(blob, fileName);
  return "downloaded";
};