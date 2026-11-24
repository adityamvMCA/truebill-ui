import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  Share2,
  FileText,
  BellRing,
  MessageSquare,
  MessageCircle,
  Mail,
  X,
  Paperclip,
  Send,
  ExternalLink,
} from "lucide-react";

import toast from "react-hot-toast";

import { createInvoicePdf, shareInvoiceFile } from "./sharePdf";
import customerApi from "../../../services/modules/customer.api";

import {
  useMessagingStore,
  addLogEntry,
  calcCostPaise,
  formatInr,
} from "../../../utils/messagingStore";

import shareApi from "../../../services/modules/shareApi";

import "./ShareInvoice.css";

/* ================================================================
   DEVICE HELPERS
================================================================ */

const MOBILE_QUERY = "(max-width: 640px)";

const isNativeApp = () =>
  typeof window !== "undefined" &&
  Boolean(window.Capacitor?.isNativePlatform?.());

const matchesMobile = () =>
  typeof window !== "undefined" &&
  window.matchMedia(MOBILE_QUERY).matches;

const useIsMobile = () => {
  const [mobile, setMobile] = useState(matchesMobile);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);

    const onChange = () => setMobile(media.matches);

    onChange();

    media.addEventListener?.("change", onChange);

    return () => media.removeEventListener?.("change", onChange);
  }, []);

  return mobile;
};

const useBodyLock = (active) => {
  useEffect(() => {
    if (!active) return undefined;

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
};

/* ================================================================
   GENERAL HELPERS
================================================================ */

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const money = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);

const niceDate = (value) => {
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

/* 10-digit Indian numbers get 91 automatically */

const cleanPhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  return digits.length === 10 ? `91${digits}` : digits;
};

/* ================================================================
   PDF BROWSER VIEW & DOWNLOAD
================================================================ */

export const openPdfInBrowser = (blob, fileName = "invoice.pdf") => {
  try {
    const file = new Blob([blob], { type: "application/pdf" });
    const url = URL.createObjectURL(file);
    const win = window.open(url, "_blank");
    if (!win) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (err) {
    console.error("Failed to open PDF in browser:", err);
  }
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = fileName;

  document.body.appendChild(a);

  a.click();

  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/* ================================================================
   CUSTOMER CONTACT
================================================================ */

const PHONE_KEYS = [
  "whatsappNumber",
  "whatsapp",
  "mobile",
  "mobileNumber",
  "phone",
  "phoneNumber",
  "contactNumber",
  "customerPhone",
  "customerMobile",
];

const EMAIL_KEYS = [
  "email",
  "emailId",
  "emailAddress",
  "customerEmail",
];

const pick = (obj, keys) => {
  if (!obj || typeof obj !== "object") return "";

  for (const key of keys) {
    if (obj[key]) return String(obj[key]);
  }

  return "";
};

const pickContact = (source) => {
  const places = [
    source,
    source?.supplier,
    source?.customer,
    source?.party,
    source?.contact,
    source?.contactPerson,
    source?.primaryContact,
    source?.billingContact,
  ];

  let phone = "";
  let email = "";

  for (const place of places) {
    phone = phone || pick(place, PHONE_KEYS);
    email = email || pick(place, EMAIL_KEYS);
  }

  return { phone, email };
};

const extractCustomer = (response) => {
  const body = response?.data;

  return (
    body?.customer ||
    body?.data?.customer ||
    body?.data ||
    body ||
    null
  );
};

const contactCache = new Map();

const useCustomerContact = (row) => {
  const customerCode = row?.customerCode;

  const inline = useMemo(
    () =>
      pickContact(
        row?.customerId && typeof row.customerId === "object"
          ? row.customerId
          : row
      ),
    [row]
  );

  const [fetched, setFetched] = useState(
    contactCache.get(customerCode) || {
      phone: "",
      email: "",
    }
  );

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerCode) return undefined;

    if (contactCache.has(customerCode)) {
      setFetched(contactCache.get(customerCode));
      return undefined;
    }

    if (inline.phone && inline.email) return undefined;

    let cancelled = false;

    setLoading(true);

    customerApi
      .getByCode(customerCode)
      .then((response) => {
        const found = pickContact(extractCustomer(response));

        contactCache.set(customerCode, found);

        if (!cancelled) {
          setFetched(found);
        }
      })
      .catch(() => {
        // User can enter contact manually.
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerCode, inline.phone, inline.email]);

  return {
    contact: {
      phone: inline.phone || fetched.phone,
      email: inline.email || fetched.email,
    },
    loading,
  };
};

/* ================================================================
   SHARE ACTIONS
================================================================ */

export const SHARE_ACTIONS = [
  {
    key: "link-whatsapp",
    label: "Share via WhatsApp",
    hint: "Click & View Link (No download)",
    icon: MessageCircle,
    channel: "whatsapp",
    kind: "invoice",
    mode: "link",
    tone: "green",
  },
  {
    key: "open-browser",
    label: "Open in Web Browser",
    hint: "View, Print or Download",
    icon: ExternalLink,
    channel: "browser",
    kind: "invoice",
    tone: "blue",
  },
  {
    key: "pdf-whatsapp",
    label: "Share Invoice PDF",
    hint: "Send PDF file attachment",
    icon: FileText,
    channel: "whatsapp",
    kind: "invoice",
    mode: "file",
    tone: "green",
  },
  {
    key: "pdf-gmail",
    label: "Share Invoice PDF",
    hint: "Send via Gmail",
    icon: FileText,
    channel: "email",
    kind: "invoice",
    mode: "file",
    tone: "red",
  },
  {
    key: "remind-whatsapp",
    label: "Payment Reminder",
    hint: "Remind on WhatsApp",
    icon: BellRing,
    channel: "whatsapp",
    kind: "reminder",
    tone: "green",
  },
  {
    key: "remind-gmail",
    label: "Payment Reminder",
    hint: "Remind on Gmail",
    icon: BellRing,
    channel: "email",
    kind: "reminder",
    tone: "red",
  },
  {
    key: "message",
    label: "Send Normal Message",
    hint: "Write your own message",
    icon: MessageSquare,
    channel: "whatsapp",
    kind: "message",
    tone: "blue",
  },
];

/* ================================================================
   MESSAGE CONTENT
================================================================ */

export const buildShareContent = (row, action, docLink = "") => {
  const isPurchase = Boolean(row.billNumber);
  const isDebitNote = Boolean(row.debitNoteNumber) || (Boolean(row.returnNumber) && Boolean(row.supplierName || row.supplier));
  const isCreditNote = Boolean(row.creditNoteNumber) || (Boolean(row.returnNumber) && Boolean(row.customerName || row.customer));
  const isGRN = Boolean(row.grnNumber) || Boolean(row.receiptNumber);

  const docTitle = isPurchase
    ? "Purchase Bill"
    : isDebitNote
      ? "Debit Note"
      : isCreditNote
        ? "Credit Note"
        : isGRN
          ? "Goods Receipt Note"
          : "Invoice";

  const customer =
    row.customerName ||
    row.supplierName ||
    row.partyName ||
    row.ledgerName ||
    row.supplier?.supplierName ||
    row.customer?.customerName ||
    "Customer";

  const no =
    row.invoiceNumber ||
    row.billNumber ||
    row.returnNumber ||
    row.creditNoteNumber ||
    row.debitNoteNumber ||
    row.grnNumber ||
    row.receiptNumber ||
    "";

  const totalPaise =
    row.totalAmountPaise !== undefined
      ? row.totalAmountPaise
      : row.totalAmount !== undefined
        ? Math.round(Number(row.totalAmount) * 100)
        : 0;

  const total = money(totalPaise);
  const due = money(row.outstandingAmountPaise || 0);

  const dueDate = niceDate(row.dueDate);
  const invDate = niceDate(
    row.invoiceDate || row.billDate || row.returnDate || row.creditNoteDate || row.receiptDate || row.date
  );

  const whatsapp = action.channel === "whatsapp";
  const bold = (text) => (whatsapp ? `*${text}*` : text);

  if (action.kind === "invoice" || action.kind === "document") {
    const isLinkMode = action.mode !== "file";
    const linkSection = docLink
      ? `\n👉 ${bold("View & Print Online (No download needed):")}\n${docLink}\n`
      : "";

    return {
      subject: `${docTitle} ${no} from TrustIQ`,
      body: [
        `Hello ${customer},`,
        ``,
        isLinkMode
          ? `Your ${docTitle} ${bold(no)} dated ${invDate} is ready.`
          : `Please find attached your ${docTitle} ${bold(no)} dated ${invDate}.`,
        totalPaise > 0 ? `Total Amount: ${bold(total)}` : ``,
        dueDate && dueDate !== "N/A" ? `Due Date: ${dueDate}` : ``,
        linkSection,
        `Thank you for your business.`,
      ].filter(Boolean).join("\n"),
    };
  }

  if (action.kind === "reminder") {
    const linkSection = docLink
      ? `\n👉 ${bold("View & Print Online:")}\n${docLink}\n`
      : "";

    return {
      subject: `Payment reminder: ${docTitle} ${no}`,
      body: [
        `Hello ${customer},`,
        ``,
        `This is a friendly reminder that ${docTitle} ${bold(no)} has a pending balance.`,
        ``,
        `Total: ${total}`,
        `Pending Amount: ${bold(due)}`,
        dueDate && dueDate !== "N/A" ? `Due Date: ${bold(dueDate)}` : ``,
        linkSection,
        `Kindly arrange the payment at your earliest convenience. Please ignore this message if already paid.`,
      ].filter(Boolean).join("\n"),
    };
  }

  return {
    subject: `Regarding ${docTitle} ${no}`,
    body: `Hello ${customer},\n\n`,
  };
};

/* ================================================================
   OPEN WHATSAPP / GMAIL
================================================================ */

const openLink = (url) => {
  if (isNativeApp()) {
    window.open(url, "_system");
    return;
  }

  if (matchesMobile()) {
    window.location.href = url;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};

/* ================================================================
   MANUAL SENDING
================================================================ */

const previewSend = async (payload) => {
  const text = encodeURIComponent(payload.message);

  const openChat = () => {
    if (payload.channel === "whatsapp") {
      openLink(
        `https://wa.me/${payload.to}?text=${text}`
      );
      return;
    }

    const subject = encodeURIComponent(payload.subject || "");

    const to = encodeURIComponent(payload.to);

    openLink(
      isNativeApp()
        ? `mailto:${to}?subject=${subject}&body=${text}`
        : `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${text}`
    );
  };

  // Reminders and normal messages have no attachment.
  if (!payload.attachInvoicePdf) {
    openChat();

    toast.success("Message opened.");

    return;
  }

  const toastId = toast.loading("Preparing invoice PDF...");

  try {
    const blob = await createInvoicePdf(payload.rawRow || payload.invoiceNumber);

    const fileName = `${payload.invoiceNumber || "document"}.pdf`;

    // Capacitor Android / iOS native share sheet.
    if (isNativeApp()) {
      const result = await shareInvoiceFile({
        blob,
        fileName,
        text: payload.message,
        title: payload.subject || `Document ${payload.invoiceNumber || ""}`,
      });

      if (result === "shared") {
        toast.success("Choose the app and contact to send.", {
          id: toastId,
        });

        return;
      }

      openChat();

      toast.success(
        `${fileName} saved. Attach it with the paperclip.`,
        {
          id: toastId,
          duration: 7000,
        }
      );

      return;
    }

    // Web / mobile browser: open in browser tab directly without prompting to download
    openPdfInBrowser(blob, fileName);

    toast.success("Opening invoice in browser tab. You can view, print, or download.", {
      id: toastId,
      duration: 5000,
    });

    await delay(700);

    openChat();
  } catch (error) {
    toast.dismiss(toastId);

    throw error.name === "AbortError"
      ? new Error("Sharing cancelled.")
      : error;
  }
};

/* ================================================================
   BUSINESS API SENDER
================================================================ */

const businessSend = async (payload) => {
  try {
    const response = await shareApi.send({
      invoiceNumber: payload.invoiceNumber,
      channel: payload.channel,
      kind: payload.kind,
      to: payload.to,
      subject: payload.subject,
      message: payload.message,
      attachInvoicePdf: Boolean(payload.attachInvoicePdf),
      invoiceId: payload.invoiceId,
      customerId: payload.customerId,
      customerCode: payload.customerCode,
      customerName: payload.customerName,
      templateId: payload.templateId || undefined,
    });

    if (!response?.data?.success) {
      throw new Error(
        response?.data?.message || "Unable to send message."
      );
    }

    return response.data;
  } catch (error) {
    throw new Error(
      error?.response?.data?.message ||
        error.message ||
        "Unable to send."
    );
  }
};

/* ================================================================
   SENDING ANIMATION
================================================================ */

function SendingAnimation({ channel }) {
  const isEmail = channel === "email";

  return (
    <div className="shr-sending" role="status" aria-live="polite">
      <div className="shr-sending-card">
        <svg
          viewBox="0 0 300 170"
          className="shr-throw"
          aria-hidden="true"
        >
          {/* Ground */}
          <ellipse
            cx="70"
            cy="156"
            rx="34"
            ry="5"
            fill="rgba(0,0,0,.08)"
          />

          {/* Legs */}
          <line
            x1="62"
            y1="118"
            x2="54"
            y2="152"
            stroke="#334155"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <line
            x1="78"
            y1="118"
            x2="86"
            y2="152"
            stroke="#334155"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Body */}
          <rect
            x="52"
            y="76"
            width="36"
            height="46"
            rx="14"
            fill="#4f46e5"
          />

          {/* Head */}
          <circle cx="70" cy="56" r="16" fill="#fcd9b6" />

          <path
            d="M54 54 Q56 38 70 38 Q85 38 86 54 Q78 46 70 46 Q62 46 54 54Z"
            fill="#1e293b"
          />

          <circle cx="75" cy="58" r="1.8" fill="#1e293b" />

          <path
            d="M71 65 Q76 68 80 64"
            stroke="#1e293b"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />

          {/* Back arm */}
          <line
            x1="56"
            y1="86"
            x2="44"
            y2="106"
            stroke="#fcd9b6"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Throwing arm */}
          <g className="shr-arm">
            <line
              x1="82"
              y1="86"
              x2="108"
              y2="86"
              stroke="#fcd9b6"
              strokeWidth="7"
              strokeLinecap="round"
            />

            <circle cx="110" cy="86" r="5" fill="#fcd9b6" />
          </g>

          {/* Flying invoice */}
          <g className="shr-paper">
            <rect
              x="-13"
              y="-17"
              width="26"
              height="34"
              rx="3"
              fill="#ffffff"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />

            <line
              x1="-8"
              y1="-9"
              x2="8"
              y2="-9"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <line
              x1="-8"
              y1="-2"
              x2="8"
              y2="-2"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <line
              x1="-8"
              y1="5"
              x2="3"
              y2="5"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <text
              x="0"
              y="14"
              textAnchor="middle"
              fontSize="7"
              fontWeight="700"
              fill="#4f46e5"
            >
              INV
            </text>
          </g>

          {/* Target */}
          <g className="shr-target">
            <rect
              x="226"
              y="42"
              width="56"
              height="56"
              rx="14"
              fill={isEmail ? "#ea4335" : "#25d366"}
            />

            {isEmail ? (
              <>
                <rect
                  x="237"
                  y="57"
                  width="34"
                  height="25"
                  rx="3"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                />

                <path
                  d="M238 59 L254 73 L270 59"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <path
                  d="M254 54 a17 17 0 1 0 0.01 0 Z M254 54"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                />

                <path
                  d="M244 85 L246 77"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <path
                  d="M248 62 q-2 8 7 14 q4 2 6 -1 l-3 -3 l-3 1 q-4 -3 -5 -6 l1 -3 l-3 -3 z"
                  fill="#fff"
                />
              </>
            )}
          </g>

          {/* Sparkles */}
          <g className="shr-spark" fill="#fbbf24">
            <circle cx="224" cy="40" r="3" />
            <circle cx="290" cy="50" r="2.5" />
            <circle cx="286" cy="104" r="3" />
          </g>
        </svg>

        <strong>
          {isEmail ? "Sending to Gmail" : "Sending to WhatsApp"}
        </strong>

        <span>Delivering your invoice...</span>
      </div>
    </div>
  );
}

/* ================================================================
   COMPOSE MODAL
================================================================ */

function ShareComposeModal({ row, action, onClose, onSend }) {
  const { contact, loading: contactLoading } = useCustomerContact(row);

  const { settings } = useMessagingStore();

  const [docLink, setDocLink] = useState("");
  const [attachPdf, setAttachPdf] = useState(action.mode === "file");
  const [bodyEdited, setBodyEdited] = useState(false);

  const [channel, setChannel] = useState(action.channel);

  const [to, setTo] = useState("");

  const [touched, setTouched] = useState(false);

  const [subject, setSubject] = useState("");

  const [body, setBody] = useState("");

  const [sending, setSending] = useState(false);

  const [templates, setTemplates] = useState([]);

  const [templateId, setTemplateId] = useState("");

  const [templatesLoading, setTemplatesLoading] = useState(false);

  const isEmail = channel === "email";

  const canSwitch = action.kind === "message";

  const savedValue = isEmail ? contact.email : contact.phone;

  const isBusiness = settings.mode === "business";

  const costPaise = calcCostPaise(settings, channel, action.kind);

  useBodyLock(true);

  const isMobileView = useIsMobile();

  /* Fetch online document view link on mount */
  useEffect(() => {
    const no =
      row.invoiceNumber ||
      row.billNumber ||
      row.returnNumber ||
      row.creditNoteNumber ||
      row.debitNoteNumber ||
      row.grnNumber ||
      row.receiptNumber ||
      "";
    if (!no) return;
    const docType = row.billNumber ? "purchaseBill" : "invoice";
    shareApi
      .getDocumentLink(docType, no)
      .then((res) => {
        if (res?.data?.url) {
          setDocLink(res.data.url);
        }
      })
      .catch(() => {});
  }, [row]);

  /* Load tenant-scoped templates */

  useEffect(() => {
    if (!isBusiness) {
      setTemplates([]);
      setTemplateId("");
      return undefined;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      setTemplatesLoading(true);

      try {
        const response = await shareApi.listTemplates({
          channel,
          kind: action.kind,
        });

        const allTemplates = response?.data?.data || [];

        const available = allTemplates.filter((template) => {
          if (
            template.channel !== channel ||
            template.kind !== action.kind
          ) {
            return false;
          }

          if (template.isDeleted) return false;

          if (
            channel === "whatsapp" &&
            template.status !== "APPROVED"
          ) {
            return false;
          }

          if (
            channel === "whatsapp" &&
            action.kind === "invoice" &&
            attachPdf &&
            template.attachPdf !== true &&
            !template.name?.includes("pdf")
          ) {
            return false;
          }

          return true;
        });

        if (!cancelled) {
          setTemplates(available);
          setTemplateId(available[0]?._id || "");
        }
      } catch (error) {
        if (!cancelled) {
          setTemplates([]);
          setTemplateId("");

          toast.error(
            error?.response?.data?.message ||
              "Unable to load message templates."
          );
        }
      } finally {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [isBusiness, channel, action.kind, attachPdf]);

  /* Prefill customer contact */

  useEffect(() => {
    if (touched) return;

    setTo(savedValue || "");
  }, [savedValue, touched]);

  /* Update message when channel, format, or docLink changes */

  useEffect(() => {
    if (action.kind === "message" || bodyEdited) return;

    const next = buildShareContent(
      row,
      {
        ...action,
        channel,
        mode: attachPdf ? "file" : "link",
      },
      docLink
    );

    setSubject(next.subject);
    setBody(next.body);
  }, [channel, row, action, attachPdf, docLink, bodyEdited]);

  /* Escape key */

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !sending) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sending]);

  const switchChannel = (next) => {
    setTouched(false);
    setChannel(next);
  };

  /* ================================================================
     SUBMIT
  ================================================================ */

  const submit = async () => {
    if (!to.trim()) {
      toast.error(
        isEmail
          ? "Enter an email address."
          : "Enter a phone number."
      );

      return;
    }

    if (
      isEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())
    ) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (!isEmail && cleanPhone(to).length < 10) {
      toast.error("Enter a valid phone number.");
      return;
    }

    if (!body.trim()) {
      toast.error("Message cannot be empty.");
      return;
    }

    if (isBusiness && channel === "whatsapp" && !templateId) {
      toast.error("Select an approved WhatsApp template.");
      return;
    }

    const recipient = isEmail ? to.trim() : cleanPhone(to);

    const payload = {
      actionKey: action.key,
      kind: action.kind,
      channel,
      mode: settings.mode,
      to: recipient,
      subject: isEmail ? subject : undefined,
      message: body,
      attachInvoicePdf: attachPdf,
      rawRow: row,
      invoiceNumber:
        row.invoiceNumber ||
        row.billNumber ||
        row.returnNumber ||
        row.creditNoteNumber ||
        row.debitNoteNumber ||
        row.grnNumber ||
        row.receiptNumber ||
        "",
      invoiceId: row._id,
      customerId:
        row.customerId?._id ||
        row.customerId ||
        row.supplierId?._id ||
        row.supplierId ||
        undefined,
      customerCode: row.customerCode || row.supplierCode || "",
      customerName:
        row.customerName ||
        row.supplierName ||
        row.partyName ||
        row.supplier?.supplierName ||
        row.customer?.customerName ||
        "",
      templateId: isBusiness
        ? templateId || undefined
        : undefined,
    };

    const logBase = {
      mode: settings.mode,
      channel,
      kind: action.kind,
      to: recipient,
      invoiceNumber:
        row.invoiceNumber ||
        row.billNumber ||
        row.returnNumber ||
        row.creditNoteNumber ||
        row.debitNoteNumber ||
        row.grnNumber ||
        row.receiptNumber ||
        "",
      customerCode: row.customerCode || row.supplierCode || "",
      customerName:
        row.customerName ||
        row.supplierName ||
        row.partyName ||
        "",
    };

    // Email always uses backend SMTP.
    const sender =
      onSend ||
      (isEmail || isBusiness ? businessSend : previewSend);

    const usesBackend = isEmail || isBusiness;

    setSending(true);

    try {
      if (usesBackend) {
        // Keep animation visible for at least 1.8 seconds.
        await Promise.all([
          sender(payload),
          delay(1800),
        ]);
      } else {
        await sender(payload);

        addLogEntry({
          ...logBase,
          status: "sent",
          costPaise,
        });
      }

      onClose();
    } catch (error) {
      if (!usesBackend) {
        addLogEntry({
          ...logBase,
          status: "failed",
          costPaise: 0,
        });
      }

      toast.error(error?.message || "Unable to send.");
    } finally {
      setSending(false);
    }
  };

  /* ================================================================
     CONTACT HINT
  ================================================================ */

  const hint = contactLoading
    ? "Fetching from customer profile..."
    : !touched && savedValue
      ? "Auto-filled from customer profile. You can edit it."
      : touched
        ? "Using the value you entered."
        : "No saved contact found. Enter it manually.";

  const Icon = action.icon;

  /* ================================================================
     MODAL JSX
  ================================================================ */

  return createPortal(
    <div
      className="shr-overlay"
      onClick={() => !sending && onClose()}
    >
      <div
        className="shr-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shr-grabber" aria-hidden="true" />

        {/* Header */}

        <header className="shr-head">
          <div className={`shr-head-icon shr-${action.tone}`}>
            <Icon size={20} />
          </div>

          <div className="shr-head-text">
            <h3>{action.label}</h3>

            <p>
              {row.customerName || "Customer"} · {row.invoiceNumber}
            </p>
          </div>

          <button
            type="button"
            className="shr-close"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Body */}

        <div className="shr-body">
          <div
            className={`shr-mode ${
              isBusiness ? "shr-mode-biz" : ""
            }`}
          >
            <strong>
              {isEmail
                ? "Automatic Gmail SMTP"
                : isBusiness
                  ? "Business Account API"
                  : "Manual WhatsApp mode"}
            </strong>

            <span>
              {isBusiness
                ? `Estimated cost: ${formatInr(costPaise)}`
                : "Opens your app. No charge."}
            </span>
          </div>

          {/* Channel tabs */}

          {canSwitch && (
            <div className="shr-tabs">
              <button
                type="button"
                className={
                  channel === "whatsapp" ? "active" : ""
                }
                onClick={() => switchChannel("whatsapp")}
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>

              <button
                type="button"
                className={
                  channel === "email" ? "active" : ""
                }
                onClick={() => switchChannel("email")}
              >
                <Mail size={16} />
                Gmail
              </button>
            </div>
          )}

          {/* Share Format Selector */}
          {action.kind === "invoice" && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                background: "#f1f5f9",
                padding: "4px",
                borderRadius: "8px",
                marginBottom: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setAttachPdf(false);
                  setBodyEdited(false);
                }}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "none",
                  background: !attachPdf ? "#ffffff" : "transparent",
                  color: !attachPdf ? "#1e293b" : "#64748b",
                  fontWeight: !attachPdf ? "600" : "500",
                  boxShadow: !attachPdf ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "12.5px",
                }}
              >
                <ExternalLink size={14} color={!attachPdf ? "#2563eb" : "#64748b"} />
                <span>Online View Link (No Download)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachPdf(true);
                  setBodyEdited(false);
                }}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "none",
                  background: attachPdf ? "#ffffff" : "transparent",
                  color: attachPdf ? "#1e293b" : "#64748b",
                  fontWeight: attachPdf ? "600" : "500",
                  boxShadow: attachPdf ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "12.5px",
                }}
              >
                <Paperclip size={14} color={attachPdf ? "#2563eb" : "#64748b"} />
                <span>Attach PDF File</span>
              </button>
            </div>
          )}

          {/* Templates */}

          {isBusiness && (
            <label className="shr-field">
              <span>
                {channel === "whatsapp"
                  ? "WhatsApp Template"
                  : "Email Template (Optional)"}
              </span>

              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={templatesLoading || sending}
              >
                <option value="">
                  {templatesLoading
                    ? "Loading templates..."
                    : "Select template"}
                </option>

                {templates.map((template) => (
                  <option
                    key={template._id}
                    value={template._id}
                  >
                    {template.label}
                    {template.status === "APPROVED"
                      ? " (Approved)"
                      : ""}
                  </option>
                ))}
              </select>

              <small className="shr-hint">
                {channel === "whatsapp"
                  ? "Only Meta-approved compatible templates can be sent."
                  : "Choose an email template or leave blank to send your message."}
              </small>

              {channel === "whatsapp" &&
                templates.length === 0 &&
                !templatesLoading && (
                  <small className="shr-hint shr-error">
                    No approved compatible template found. Create and
                    approve one first.
                  </small>
                )}
            </label>
          )}

          {/* Recipient */}

          <label className="shr-field">
            <span>
              {isEmail ? "To (email)" : "To (WhatsApp number)"}
            </span>

            <div className="shr-input-row">
              {!isEmail && (
                <em className="shr-prefix">+91</em>
              )}

              <input
                type={isEmail ? "email" : "tel"}
                inputMode={isEmail ? "email" : "tel"}
                autoComplete={isEmail ? "email" : "tel"}
                autoCapitalize="none"
                value={to}
                placeholder={
                  contactLoading
                    ? "Loading customer details..."
                    : isEmail
                      ? "customer@example.com"
                      : "98765 43210"
                }
                onChange={(e) => {
                  setTouched(true);
                  setTo(e.target.value);
                }}
                disabled={sending}
              />
            </div>

            <small className="shr-hint">{hint}</small>
          </label>

          {/* Subject */}

          {isEmail && (
            <label className="shr-field">
              <span>Subject</span>

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
              />
            </label>
          )}

          {/* Message */}

          <label className="shr-field">
            <span>Message</span>

            <textarea
              rows={isMobileView ? 10 : 9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={
                sending ||
                (isBusiness && Boolean(templateId))
              }
            />

            {isBusiness && templateId && (
              <small className="shr-hint">
                The selected template's approved message body will
                be sent. This text is shown as a local preview only.
              </small>
            )}
          </label>

          {/* Attachment / Link Preview */}

          {attachPdf ? (
            <div className="shr-attachment">
              <Paperclip size={15} />

              <span>{row.invoiceNumber}.pdf</span>

              <small>
                {isBusiness
                  ? "will be attached"
                  : "attach manually in manual mode"}
              </small>
            </div>
          ) : docLink ? (
            <div className="shr-attachment" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <ExternalLink size={15} color="#16a34a" />

              <span style={{ color: "#166534", fontWeight: "600" }}>Online View Link</span>

              <small style={{ color: "#15803d" }}>
                Recipient clicks link to view directly in browser (no download)
              </small>
            </div>
          ) : null}
        </div>

        {/* Footer */}

        <footer className="shr-foot">
          <button
            type="button"
            className="shr-btn shr-btn-ghost"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>

          <button
            type="button"
            className="shr-btn shr-btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={async () => {
              const toastId = toast.loading("Opening invoice in browser...");
              try {
                const blob = await createInvoicePdf(row);
                openPdfInBrowser(blob, `${row.invoiceNumber || "invoice"}.pdf`);
                toast.success("Opened in new browser tab! You can print or download.", { id: toastId });
              } catch (err) {
                toast.error("Failed to render invoice PDF", { id: toastId });
              }
            }}
          >
            <ExternalLink size={15} />
            <span>Open in Browser</span>
          </button>

          <button
            type="button"
            className={`shr-btn shr-btn-primary shr-${
              isEmail ? "red" : "green"
            }`}
            onClick={submit}
            disabled={sending}
          >
            <Send size={16} />

            {sending
              ? "Sending..."
              : isEmail
                ? "Send Email"
                : "Send on WhatsApp"}
          </button>
        </footer>

        {/* Sending Animation Overlay */}

        {sending && (
          <SendingAnimation channel={channel} />
        )}
      </div>
    </div>,
    document.body
  );
}

/* ================================================================
   SHARE BUTTON + MENU
================================================================ */

/**
 * Usage:
 *
 * <ShareInvoiceButton
 *   row={row}
 *   disabled={false}
 *   onSend={async (payload) => {...}}
 * />
 *
 * onSend is optional.
 *
 * Manual mode:
 * WhatsApp opens manually.
 *
 * Business mode:
 * WhatsApp and Gmail use backend API.
 *
 * Email:
 * Always uses backend SMTP by default.
 */

export default function ShareInvoiceButton({
  row,
  disabled = false,
  onSend,
  className = "",
  label = "Share",
}) {
  const btnRef = useRef(null);

  const menuRef = useRef(null);

  const isMobile = useIsMobile();

  const [menu, setMenu] = useState(null);

  const [active, setActive] = useState(null);

  const isCancelled = row?.status === "CANCELLED";

  const isPaid = row?.paymentStatus === "PAID";

  const isPosted = row?.status === "POSTED";

  useBodyLock(Boolean(menu) && isMobile);

  /* Disable reasons */

  const reasonDisabled = (action) => {
    if (isCancelled) {
      return "Invoice is cancelled";
    }

    if (action.kind === "reminder") {
      if (!isPosted) {
        return "Post the invoice first";
      }

      if (isPaid) {
        return "Already paid";
      }
    }

    return "";
  };

  /* Open menu */

  const toggleMenu = (event) => {
    event.stopPropagation();

    if (menu) {
      setMenu(null);
      return;
    }

    if (isMobile) {
      setMenu({});
      return;
    }

    const rect = btnRef.current.getBoundingClientRect();

    const width = Math.min(270, window.innerWidth - 16);

    const height = 340;

    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8
    );

    const top =
      rect.bottom + height > window.innerHeight
        ? Math.max(8, rect.top - height - 6)
        : rect.bottom + 6;

    setMenu({ top, left });
  };

  /* Outside click and Escape */

  useEffect(() => {
    if (!menu) return undefined;

    const close = () => setMenu(null);

    const onDown = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      ) {
        return;
      }

      close();
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
      }
    };

    document.addEventListener("mousedown", onDown);

    document.addEventListener("keydown", onKey);

    if (!isMobile) {
      window.addEventListener("scroll", close, true);

      window.addEventListener("resize", close);
    }

    return () => {
      document.removeEventListener("mousedown", onDown);

      document.removeEventListener("keydown", onKey);

      window.removeEventListener("scroll", close, true);

      window.removeEventListener("resize", close);
    };
  }, [menu, isMobile]);

  /* Menu content */

  const menuContent = (
    <div
      ref={menuRef}
      className={`shr-menu ${
        isMobile ? "shr-menu-sheet" : ""
      }`}
      role="menu"
      style={
        isMobile
          ? undefined
          : {
              top: menu?.top,
              left: menu?.left,
            }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {isMobile && (
        <div
          className="shr-grabber"
          aria-hidden="true"
        />
      )}

      <div className="shr-menu-title">
        <div>
          <strong>
            {row.customerName || row.supplierName || row.partyName || "Party"}
          </strong>

          <span>
            {row.invoiceNumber ||
              row.billNumber ||
              row.returnNumber ||
              row.creditNoteNumber ||
              row.debitNoteNumber ||
              row.grnNumber ||
              row.receiptNumber ||
              ""}
          </span>
        </div>

        {isMobile && (
          <button
            type="button"
            className="shr-close"
            aria-label="Close"
            onClick={() => setMenu(null)}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {SHARE_ACTIONS.map((action) => {
        const reason = reasonDisabled(action);

        const ActionIcon = action.icon;

        return (
          <button
            key={action.key}
            type="button"
            role="menuitem"
            className="shr-item"
            disabled={Boolean(reason)}
            onClick={async () => {
              setMenu(null);
              if (action.key === "open-browser") {
                const toastId = toast.loading("Opening invoice in browser...");
                try {
                  const blob = await createInvoicePdf(row);
                  openPdfInBrowser(blob, `${row.invoiceNumber || "invoice"}.pdf`);
                  toast.success("Opened in new browser tab! You can print or download.", { id: toastId });
                } catch (err) {
                  toast.error("Failed to render invoice PDF", { id: toastId });
                }
                return;
              }
              setActive(action);
            }}
          >
            <span
              className={`shr-item-icon shr-${action.tone}`}
            >
              <ActionIcon size={18} />
            </span>

            <span className="shr-item-text">
              <strong>{action.label}</strong>

              <small>{reason || action.hint}</small>
            </span>
          </button>
        );
      })}
    </div>
  );

  /* Main JSX */

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`shr-trigger ${className}`}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        aria-label={`Share ${row?.invoiceNumber || row?.billNumber || row?.returnNumber || row?.receiptNumber || "document"}`}
        onClick={toggleMenu}
      >
        <Share2 size={14} strokeWidth={2.5} />

        <span>{label}</span>
      </button>

      {/* Menu portal */}

      {menu &&
        createPortal(
          isMobile ? (
            <div
              className="shr-sheet-overlay"
              onClick={() => setMenu(null)}
            >
              {menuContent}
            </div>
          ) : (
            menuContent
          ),
          document.body
        )}

      {/* Compose modal */}

      {active && (
        <ShareComposeModal
          row={row}
          action={active}
          onClose={() => setActive(null)}
          onSend={onSend}
        />
      )}
    </>
  );
}
