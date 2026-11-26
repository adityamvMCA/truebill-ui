import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { paiseToRupees } from "./amount";

/**
 * Escapes XML special characters for Tally Prime / ERP 9 compatibility
 */
export function escapeXml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Converts any date or string into Tally format: YYYYMMDD
 */
export function formatTallyDate(dateVal) {
  if (!dateVal) {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return formatTallyDate(null);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Retrieves the current tenant or company name for the Tally header
 */
export function getTallyCompanyName() {
  try {
    const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
    return tenant.companyName || tenant.name || "TrueBill Company";
  } catch {
    return "TrueBill Company";
  }
}

/**
 * Wraps generated voucher XML tags in the standard Tally envelope
 */
function wrapTallyEnvelope(vouchersXml, companyName) {
  const company = companyName || getTallyCompanyName();
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(company)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Normalizes an amount to Rupees whether it is provided in paise or rupees
 */
function getAmountRupees(rupeesVal, paiseVal) {
  if (rupeesVal !== undefined && rupeesVal !== null && !isNaN(Number(rupeesVal))) {
    return Number(rupeesVal);
  }
  if (paiseVal !== undefined && paiseVal !== null && !isNaN(Number(paiseVal))) {
    return paiseToRupees(paiseVal);
  }
  return 0;
}

/**
 * 1. SALES INVOICES -> Tally Sales Vouchers XML
 */
export function generateSalesInvoicesTallyXml(invoices = [], companyName) {
  if (!Array.isArray(invoices) || !invoices.length) return "";

  const vouchers = invoices.map((inv) => {
    const date = formatTallyDate(inv.invoiceDate || inv.createdAt);
    const invoiceNumber = escapeXml(inv.invoiceNumber || "INV");
    const customerName = escapeXml(inv.customerName || "Sundry Debtors");
    const total = getAmountRupees(inv.totalAmount, inv.totalAmountPaise);
    const taxable = getAmountRupees(inv.taxableAmount, inv.taxableAmountPaise) || total;
    const cgst = getAmountRupees(inv.cgstAmount, inv.cgstAmountPaise);
    const sgst = getAmountRupees(inv.sgstAmount, inv.sgstAmountPaise);
    const igst = getAmountRupees(inv.igstAmount, inv.igstAmountPaise);
    const roundOff = getAmountRupees(inv.roundOff, inv.roundOffPaise);

    let itemsXml = "";
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      itemsXml = inv.items
        .map((item) => {
          const itemAmt = getAmountRupees(item.amount, item.amountPaise) || (Number(item.quantity || 1) * Number(item.rate || 0));
          const qty = Number(item.quantity || 1);
          const rate = Number(item.rate || (itemAmt / qty) || 0);
          const unit = escapeXml(item.unit || "Nos");
          const itemName = escapeXml(item.productName || item.description || "Goods");

          return `        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${itemName}</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <RATE>${rate.toFixed(2)} / ${unit}</RATE>
          <ACTUALQTY>${qty} ${unit}</ACTUALQTY>
          <BILLEDQTY>${qty} ${unit}</BILLEDQTY>
          <AMOUNT>${itemAmt.toFixed(2)}</AMOUNT>
          <ACCOUNTINGALLOCATIONS.LIST>
            <LEDGERNAME>Sales Account</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${itemAmt.toFixed(2)}</AMOUNT>
          </ACCOUNTINGALLOCATIONS.LIST>
        </ALLINVENTORYENTRIES.LIST>`;
        })
        .join("\n");
    }

    const ledgersXml = `        <!-- Party Ledger (Debtor / Customer) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${customerName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${total.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <!-- Sales Ledger (Revenue) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Sales Account</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${taxable.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>${
          cgst > 0
            ? `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output CGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${cgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ""
        }${
          sgst > 0
            ? `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output SGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${sgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ""
        }${
          igst > 0
            ? `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output IGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${igst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ""
        }${
          Math.abs(roundOff) > 0.001
            ? `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Round Off</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${roundOff < 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
          <AMOUNT>${Math.abs(roundOff).toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ""
        }`;

    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${invoiceNumber}</VOUCHERNUMBER>
            <REFERENCE>${invoiceNumber}</REFERENCE>
            <PARTYLEDGERNAME>${customerName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <NARRATION>${escapeXml(inv.notes || `Sales Invoice ${inv.invoiceNumber}`)}</NARRATION>
${ledgersXml}
${itemsXml}
          </VOUCHER>
        </TALLYMESSAGE>`;
  });

  return wrapTallyEnvelope(vouchers.join("\n"), companyName);
}

/**
 * 2. PURCHASE BILLS -> Tally Purchase Vouchers XML
 */
export function generatePurchaseBillsTallyXml(bills = [], companyName) {
  if (!Array.isArray(bills) || !bills.length) return "";

  const vouchers = bills.map((bill) => {
    const date = formatTallyDate(bill.billDate || bill.createdAt);
    const billNumber = escapeXml(bill.billNumber || bill.supplierInvoiceNumber || "BILL");
    const supplierName = escapeXml(bill.supplierName || "Sundry Creditors");
    const total = getAmountRupees(bill.totalAmount, bill.totalAmountPaise);
    const taxable = getAmountRupees(bill.taxableAmount, bill.taxableAmountPaise) || total;
    const cgst = getAmountRupees(bill.cgstAmount, bill.cgstAmountPaise);
    const sgst = getAmountRupees(bill.sgstAmount, bill.sgstAmountPaise);
    const igst = getAmountRupees(bill.igstAmount, bill.igstAmountPaise);

    const ledgersXml = `        <!-- Party Ledger (Creditor / Supplier) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${supplierName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${total.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <!-- Purchase Ledger (Expense) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Purchase Account</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${taxable.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>${
          cgst > 0
            ? `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Input CGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${cgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ""
        }${
          sgst > 0
            ? `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Input SGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${sgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ""
        }${
          igst > 0
            ? `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Input IGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${igst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ""
        }`;

    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${billNumber}</VOUCHERNUMBER>
            <REFERENCE>${billNumber}</REFERENCE>
            <PARTYLEDGERNAME>${supplierName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <NARRATION>${escapeXml(bill.notes || `Purchase Bill ${bill.billNumber}`)}</NARRATION>
${ledgersXml}
          </VOUCHER>
        </TALLYMESSAGE>`;
  });

  return wrapTallyEnvelope(vouchers.join("\n"), companyName);
}

/**
 * 3. CUSTOMER RECEIPTS -> Tally Receipt Vouchers XML
 */
export function generateReceiptsTallyXml(receipts = [], companyName) {
  if (!Array.isArray(receipts) || !receipts.length) return "";

  const vouchers = receipts.map((rec) => {
    const date = formatTallyDate(rec.receiptDate || rec.createdAt);
    const recNumber = escapeXml(rec.receiptNumber || "REC");
    const customerName = escapeXml(rec.customerName || "Customer");
    const amount = getAmountRupees(rec.amount, rec.amountPaise);
    const bankOrCash = rec.paymentMode === "CASH" ? "Cash" : escapeXml(rec.bankName || "Bank Account");

    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${recNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${customerName}</PARTYLEDGERNAME>
            <NARRATION>${escapeXml(rec.remarks || rec.referenceNumber || `Receipt from ${rec.customerName}`)}</NARRATION>
            <!-- Bank / Cash Ledger (Debit) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${bankOrCash}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <!-- Customer Ledger (Credit) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${customerName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>`;
  });

  return wrapTallyEnvelope(vouchers.join("\n"), companyName);
}

/**
 * 4. SUPPLIER PAYMENTS -> Tally Payment Vouchers XML
 */
export function generatePaymentsTallyXml(payments = [], companyName) {
  if (!Array.isArray(payments) || !payments.length) return "";

  const vouchers = payments.map((pay) => {
    const date = formatTallyDate(pay.paymentDate || pay.createdAt);
    const payNumber = escapeXml(pay.paymentNumber || "PAY");
    const supplierName = escapeXml(pay.supplierName || "Supplier");
    const amount = getAmountRupees(pay.amount, pay.amountPaise);
    const bankOrCash = pay.paymentMode === "CASH" ? "Cash" : escapeXml(pay.bankName || "Bank Account");

    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Payment" ACTION="Create">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${payNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${supplierName}</PARTYLEDGERNAME>
            <NARRATION>${escapeXml(pay.remarks || pay.referenceNumber || `Payment to ${pay.supplierName}`)}</NARRATION>
            <!-- Supplier Ledger (Debit) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${supplierName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <!-- Bank / Cash Ledger (Credit) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${bankOrCash}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>`;
  });

  return wrapTallyEnvelope(vouchers.join("\n"), companyName);
}

/**
 * 5. DELIVERY NOTES -> Tally Delivery Note Vouchers XML
 */
export function generateDeliveryNotesTallyXml(notes = [], companyName) {
  if (!Array.isArray(notes) || !notes.length) return "";

  const vouchers = notes.map((note) => {
    const date = formatTallyDate(note.deliveryDate || note.createdAt);
    const noteNumber = escapeXml(note.deliveryNoteNumber || "DN");
    const customerName = escapeXml(note.customerName || "Customer");

    let itemsXml = "";
    if (Array.isArray(note.items) && note.items.length > 0) {
      itemsXml = note.items
        .map((item) => {
          const qty = Number(item.quantity || 1);
          const unit = escapeXml(item.unit || "Nos");
          const itemName = escapeXml(item.productName || item.description || "Goods");
          return `        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${itemName}</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <ACTUALQTY>${qty} ${unit}</ACTUALQTY>
          <BILLEDQTY>${qty} ${unit}</BILLEDQTY>
        </ALLINVENTORYENTRIES.LIST>`;
        })
        .join("\n");
    }

    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Delivery Note" ACTION="Create">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Delivery Note</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${noteNumber}</VOUCHERNUMBER>
            <REFERENCE>${escapeXml(note.sourceSalesOrderNumber || noteNumber)}</REFERENCE>
            <PARTYLEDGERNAME>${customerName}</PARTYLEDGERNAME>
            <NARRATION>${escapeXml(note.notes || note.dispatchRemarks || `Delivery Note #${note.deliveryNoteNumber}`)}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${customerName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>0.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
${itemsXml}
          </VOUCHER>
        </TALLYMESSAGE>`;
  });

  return wrapTallyEnvelope(vouchers.join("\n"), companyName);
}

/**
 * Saves or shares a Tally XML file across Web and Native Mobile platforms
 */
export async function saveTallyXmlFile(fileName, xmlContent) {
  const safeName = String(fileName || "tally-export.xml").replace(/[\\/:*?"<>|]+/g, "-");

  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: safeName,
      data: xmlContent,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    try {
      await Share.share({
        title: safeName,
        dialogTitle: "Save or share Tally XML",
        url: uri,
      });
    } catch (error) {
      if (!/cancel/i.test(String(error?.message || error || ""))) {
        throw error;
      }
    }
    return;
  }

  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
