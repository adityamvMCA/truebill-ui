/* =====================================================================
   src/components/billing/ShareDelivery/ShareDeliveryNoteButton.jsx

   Delivery-note counterpart of ShareInvoiceButton.jsx.

   IMPORTANT FIX: your shareApi.send endpoint validates `kind` against the
   same enum ShareInvoiceButton uses — "invoice" | "reminder" | "message"
   — regardless of documentType. The previous version sent kind: "delivery"
   / "dispatch", which the backend rejected ("Invalid message kind.").
   This version uses the exact same three kind values as ShareInvoiceButton:

     - "invoice"  -> attaches the delivery-note PDF (was "delivery")
     - "reminder" -> dispatch/shipment update, no attachment (was "dispatch")
     - "message"  -> free-text, channel switchable

   `documentType: "DELIVERY_NOTE"` on the payload is what tells the backend
   which document this is; `kind` stays the same vocabulary as invoices.
   Everything else — button, popover menu, compose modal, manual vs.
   business send paths, sending animation — mirrors ShareInvoiceButton.jsx
   exactly, just retargeted at Delivery Notes.

   Usage (same shape as ShareInvoiceButton):

     <ShareDeliveryNoteButton row={note} disabled={false} onSend={...} />

   `row` is a Delivery Note record as returned by api.deliveryNote.getAll
   / getByNumber (the same shape DeliveryNotesList.jsx renders).

   Adjust the import paths at the top to your repo. This version matches
   the paths you've already wired up (src/invoice-templates/... for the
   templates, services/modules/... for customer + share APIs).
   ===================================================================== */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  Share2,
  FileText,
  Truck,
  MessageSquare,
  MessageCircle,
  Mail,
  X,
  Paperclip,
  Send,
} from "lucide-react";

import toast from "react-hot-toast";

import {
  createDeliveryNotePdf,
  shareDeliveryNoteFile,
} from "./shareDeliveryPdf";

import customerApi from "../../../services/modules/customer.api";

import {
  useMessagingStore,
  addLogEntry,
  calcCostPaise,
  formatInr,
} from "../../../utils/messagingStore";

import shareApi from "../../../services/modules/shareApi";

import { DELIVERY_TEMPLATES } from "../../../invoice-templates/deliveryNote.templates";
import { useSelectedTemplates } from "../../../invoice-templates/TemplateManager";

import "./ShareDeliveryNote.css";

/* ================================================================
   DEVICE HELPERS (identical to ShareInvoiceButton.jsx)
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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const cleanPhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits.length === 10 ? `91${digits}` : digits;
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
   CUSTOMER CONTACT (same lookup strategy as ShareInvoiceButton.jsx)
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

const EMAIL_KEYS = ["email", "emailId", "emailAddress", "customerEmail"];

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
  return body?.customer || body?.data?.customer || body?.data || body || null;
};

const contactCache = new Map();

const useCustomerContact = (row) => {
  const customerCode = row?.customerCode;

  const inline = useMemo(
    () =>
      pickContact(
        row?.customerId && typeof row.customerId === "object"
          ? row.customerId
          : row,
      ),
    [row],
  );

  const [fetched, setFetched] = useState(
    contactCache.get(customerCode) || { phone: "", email: "" },
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
        if (!cancelled) setFetched(found);
      })
      .catch(() => {
        /* user can enter contact manually */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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

   `kind` deliberately reuses ShareInvoiceButton's exact enum values
   ("invoice" | "reminder" | "message") so the shared backend validator
   accepts the payload. `documentType: "DELIVERY_NOTE"` (set in
   businessSend below) is what tells the backend this is a delivery note,
   not an invoice.
================================================================ */

export const SHARE_ACTIONS = [
  {
    key: "pdf-whatsapp",
    label: "Share Delivery Note PDF",
    hint: "Send via WhatsApp",
    icon: FileText,
    channel: "whatsapp",
    kind: "invoice", // attaches PDF — same kind ShareInvoiceButton uses for its PDF actions
    tone: "green",
  },
  {
    key: "pdf-gmail",
    label: "Share Delivery Note PDF",
    hint: "Send via Gmail",
    icon: FileText,
    channel: "email",
    kind: "invoice",
    tone: "red",
  },
  {
    key: "dispatch-whatsapp",
    label: "Dispatch Update",
    hint: "Notify on WhatsApp",
    icon: Truck,
    channel: "whatsapp",
    kind: "reminder", // no attachment — same kind ShareInvoiceButton uses for payment reminders
    tone: "green",
  },
  {
    key: "dispatch-gmail",
    label: "Dispatch Update",
    hint: "Notify on Gmail",
    icon: Truck,
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

   Branches on the same `kind` values as above: "invoice" means "attach
   the delivery note PDF", "reminder" means "dispatch/shipment update".
================================================================ */

export const buildDeliveryShareContent = (row, action) => {
  const customer = row.customerName || "Customer";
  const no = row.deliveryNoteNumber || "";
  const noteDate = niceDate(row.deliveryDate);
  const expected = niceDate(row.expectedDeliveryDate);

  const whatsapp = action.channel === "whatsapp";
  const bold = (text) => (whatsapp ? `*${text}*` : text);

  if (action.kind === "invoice") {
    return {
      subject: `Delivery Note ${no} from TrustIQ`,
      body: [
        `Hello ${customer},`,
        ``,
        `Please find attached delivery note ${bold(no)} dated ${noteDate}.`,
        ``,
        row.sourceSalesOrderNumber ? `Order Ref: ${row.sourceSalesOrderNumber}` : null,
        expected !== "N/A" ? `Expected Delivery: ${expected}` : null,
        ``,
        `Thank you for your business.`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    };
  }

  if (action.kind === "reminder") {
    return {
      subject: `Your shipment ${no} is on the way`,
      body: [
        `Hello ${customer},`,
        ``,
        `Your shipment against delivery note ${bold(no)} has been dispatched.`,
        ``,
        row.vehicleNumber ? `Vehicle: ${row.vehicleNumber}` : null,
        row.transporterName ? `Transporter: ${row.transporterName}` : null,
        row.trackingNumber ? `Tracking Number: ${bold(row.trackingNumber)}` : null,
        expected !== "N/A" ? `Expected Delivery: ${bold(expected)}` : null,
        ``,
        `We will notify you once it is delivered.`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    };
  }

  return {
    subject: `Regarding delivery note ${no}`,
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
      openLink(`https://wa.me/${payload.to}?text=${text}`);
      return;
    }
    const subject = encodeURIComponent(payload.subject || "");
    const to = encodeURIComponent(payload.to);
    openLink(
      isNativeApp()
        ? `mailto:${to}?subject=${subject}&body=${text}`
        : `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${text}`,
    );
  };

  if (!payload.attachDeliveryPdf) {
    openChat();
    toast.success("Message opened.");
    return;
  }

  const toastId = toast.loading("Preparing delivery note PDF...");

  try {
    const blob = await createDeliveryNotePdf(
      payload.deliveryNoteNumber,
      payload.templateId,
    );
    const fileName = `${payload.deliveryNoteNumber}.pdf`;

    if (isNativeApp()) {
      const result = await shareDeliveryNoteFile({
        blob,
        fileName,
        text: payload.message,
        title: payload.subject || `Delivery Note ${payload.deliveryNoteNumber}`,
      });

      if (result === "shared") {
        toast.success("Choose the app and contact to send.", { id: toastId });
        return;
      }

      openChat();
      toast.success(`${fileName} saved. Attach it with the paperclip.`, {
        id: toastId,
        duration: 7000,
      });
      return;
    }

    downloadBlob(blob, fileName);
    toast.success(`${fileName} downloaded. Attach it with the paperclip.`, {
      id: toastId,
      duration: 7000,
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
      documentType: "DELIVERY_NOTE",
      // Your /share/send endpoint validates "invoice ID or invoice number
      // is required" regardless of documentType, so the delivery note's
      // number/id ride along under the same field names the backend
      // actually checks for. deliveryNoteNumber/deliveryNoteId are kept
      // too in case the backend is (or gets) extended to read those.
      invoiceNumber: payload.deliveryNoteNumber,
      invoiceId: payload.deliveryNoteId,
      deliveryNoteNumber: payload.deliveryNoteNumber,
      deliveryNoteId: payload.deliveryNoteId,
      channel: payload.channel,
      kind: payload.kind, // "invoice" | "reminder" | "message" — matches backend enum
      to: payload.to,
      subject: payload.subject,
      message: payload.message,
      attachDeliveryPdf: Boolean(payload.attachDeliveryPdf),
      templateId: payload.templateId || undefined,
      customerId: payload.customerId,
      customerCode: payload.customerCode,
      customerName: payload.customerName,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Unable to send message.");
    }

    return response.data;
  } catch (error) {
    throw new Error(
      error?.response?.data?.message || error.message || "Unable to send.",
    );
  }
};

/* ================================================================
   SENDING ANIMATION — identical visual to ShareInvoiceButton.jsx,
   just reuses the shr-sending / shr-arm / shr-paper / shr-target
   classes from ShareDeliveryNote.css (same keyframes as ShareInvoice.css)
================================================================ */

function SendingAnimation({ channel }) {
  const isEmail = channel === "email";

  return (
    <div className="shr-sending" role="status" aria-live="polite">
      <div className="shr-sending-card">
        <svg viewBox="0 0 300 170" className="shr-throw" aria-hidden="true">
          <ellipse cx="70" cy="156" rx="34" ry="5" fill="rgba(0,0,0,.08)" />
          <line x1="62" y1="118" x2="54" y2="152" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
          <line x1="78" y1="118" x2="86" y2="152" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
          <rect x="52" y="76" width="36" height="46" rx="14" fill="#4f46e5" />
          <circle cx="70" cy="56" r="16" fill="#fcd9b6" />
          <path d="M54 54 Q56 38 70 38 Q85 38 86 54 Q78 46 70 46 Q62 46 54 54Z" fill="#1e293b" />
          <circle cx="75" cy="58" r="1.8" fill="#1e293b" />
          <path d="M71 65 Q76 68 80 64" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <line x1="56" y1="86" x2="44" y2="106" stroke="#fcd9b6" strokeWidth="7" strokeLinecap="round" />
          <g className="shr-arm">
            <line x1="82" y1="86" x2="108" y2="86" stroke="#fcd9b6" strokeWidth="7" strokeLinecap="round" />
            <circle cx="110" cy="86" r="5" fill="#fcd9b6" />
          </g>
          <g className="shr-paper">
            <rect x="-13" y="-17" width="26" height="34" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="-8" y1="-9" x2="8" y2="-9" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            <line x1="-8" y1="-2" x2="8" y2="-2" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            <line x1="-8" y1="5" x2="3" y2="5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            <text x="0" y="14" textAnchor="middle" fontSize="7" fontWeight="700" fill="#4f46e5">DN</text>
          </g>
          <g className="shr-target">
            <rect x="226" y="42" width="56" height="56" rx="14" fill={isEmail ? "#ea4335" : "#25d366"} />
            {isEmail ? (
              <>
                <rect x="237" y="57" width="34" height="25" rx="3" fill="none" stroke="#fff" strokeWidth="3" />
                <path d="M238 59 L254 73 L270 59" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M254 54 a17 17 0 1 0 0.01 0 Z M254 54" fill="none" stroke="#fff" strokeWidth="3" />
                <path d="M244 85 L246 77" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                <path d="M248 62 q-2 8 7 14 q4 2 6 -1 l-3 -3 l-3 1 q-4 -3 -5 -6 l1 -3 l-3 -3 z" fill="#fff" />
              </>
            )}
          </g>
          <g className="shr-spark" fill="#fbbf24">
            <circle cx="224" cy="40" r="3" />
            <circle cx="290" cy="50" r="2.5" />
            <circle cx="286" cy="104" r="3" />
          </g>
        </svg>

        <strong>{isEmail ? "Sending to Gmail" : "Sending to WhatsApp"}</strong>
        <span>Delivering your note...</span>
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
  const [selected] = useSelectedTemplates(); // the global default from TemplateManager

  const initial = useMemo(
    () => buildDeliveryShareContent(row, action),
    [row, action],
  );

  const [channel, setChannel] = useState(action.channel);
  const [to, setTo] = useState("");
  const [touched, setTouched] = useState(false);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [sending, setSending] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const isEmail = channel === "email";
  const attachPdf = action.kind === "invoice"; // was action.kind === "delivery"
  const canSwitch = action.kind === "message";
  const savedValue = isEmail ? contact.email : contact.phone;
  const isBusiness = settings.mode === "business";
  const costPaise = calcCostPaise(settings, channel, action.kind);

  /* Print template is no longer picked here — it always uses whatever
     you've saved as the default delivery-note template in TemplateManager. */
  const printTemplateId = selected.delivery || DELIVERY_TEMPLATES[0]?.id;

  useBodyLock(true);
  const isMobileView = useIsMobile();

  /* Load tenant-scoped message templates (business mode only) */
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
          documentType: "DELIVERY_NOTE",
        });

        const allTemplates = response?.data?.data || [];

        const available = allTemplates.filter((template) => {
          if (template.channel !== channel || template.kind !== action.kind) return false;
          if (template.isDeleted) return false;
          if (channel === "whatsapp" && template.status !== "APPROVED") return false;
          if (
            channel === "whatsapp" &&
            action.kind === "invoice" &&
            template.attachPdf !== true
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
            error?.response?.data?.message || "Unable to load message templates.",
          );
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    };

    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [isBusiness, channel, action.kind]);

  /* Prefill customer contact */
  useEffect(() => {
    if (touched) return;
    setTo(savedValue || "");
  }, [savedValue, touched]);

  /* Update message when channel changes */
  useEffect(() => {
    if (action.kind === "message") return;
    const next = buildDeliveryShareContent(row, { ...action, channel });
    setSubject(next.subject);
    setBody(next.body);
  }, [channel, row, action]);

  /* Escape key */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !sending) onClose();
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
      toast.error(isEmail ? "Enter an email address." : "Enter a phone number.");
      return;
    }

    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
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
      kind: action.kind, // "invoice" | "reminder" | "message"
      channel,
      mode: settings.mode,
      to: recipient,
      subject: isEmail ? subject : undefined,
      message: body,
      attachDeliveryPdf: attachPdf,
      deliveryNoteNumber: row.deliveryNoteNumber,
      deliveryNoteId: row._id,
      templateId: attachPdf ? printTemplateId : isBusiness ? templateId || undefined : undefined,
      customerId: row.customerId?._id || row.customerId,
      customerCode: row.customerCode,
      customerName: row.customerName,
    };

    const logBase = {
      mode: settings.mode,
      channel,
      kind: action.kind,
      to: recipient,
      deliveryNoteNumber: row.deliveryNoteNumber,
      customerCode: row.customerCode,
      customerName: row.customerName,
    };

    const sender = onSend || (isEmail || isBusiness ? businessSend : previewSend);
    const usesBackend = isEmail || isBusiness;

    setSending(true);

    try {
      if (usesBackend) {
        await Promise.all([sender(payload), delay(1800)]);
      } else {
        await sender(payload);
        addLogEntry({ ...logBase, status: "sent", costPaise });
      }
      onClose();
    } catch (error) {
      if (!usesBackend) {
        addLogEntry({ ...logBase, status: "failed", costPaise: 0 });
      }
      toast.error(error?.message || "Unable to send.");
    } finally {
      setSending(false);
    }
  };

  const hint = contactLoading
    ? "Fetching from customer profile..."
    : !touched && savedValue
      ? "Auto-filled from customer profile. You can edit it."
      : touched
        ? "Using the value you entered."
        : "No saved contact found. Enter it manually.";

  const Icon = action.icon;

  return createPortal(
    <div className="shr-overlay" onClick={() => !sending && onClose()}>
      <div
        className="shr-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shr-grabber" aria-hidden="true" />

        <header className="shr-head">
          <div className={`shr-head-icon shr-${action.tone}`}>
            <Icon size={20} />
          </div>
          <div className="shr-head-text">
            <h3>{action.label}</h3>
            <p>{row.customerName || "Customer"} · {row.deliveryNoteNumber}</p>
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

        <div className="shr-body">
          <div className={`shr-mode ${isBusiness ? "shr-mode-biz" : ""}`}>
            <strong>
              {isEmail ? "Automatic Gmail SMTP" : isBusiness ? "Business Account API" : "Manual WhatsApp mode"}
            </strong>
            <span>
              {isBusiness ? `Estimated cost: ${formatInr(costPaise)}` : "Opens your app. No charge."}
            </span>
          </div>

          {canSwitch && (
            <div className="shr-tabs">
              <button
                type="button"
                className={channel === "whatsapp" ? "active" : ""}
                onClick={() => switchChannel("whatsapp")}
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>
              <button
                type="button"
                className={channel === "email" ? "active" : ""}
                onClick={() => switchChannel("email")}
              >
                <Mail size={16} />
                Gmail
              </button>
            </div>
          )}

          {isBusiness && (
            <label className="shr-field">
              <span>
                {channel === "whatsapp" ? "WhatsApp Template" : "Email Template (Optional)"}
              </span>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={templatesLoading || sending}
              >
                <option value="">
                  {templatesLoading ? "Loading templates..." : "Select template"}
                </option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.label}
                    {template.status === "APPROVED" ? " (Approved)" : ""}
                  </option>
                ))}
              </select>
              <small className="shr-hint">
                {channel === "whatsapp"
                  ? "Only Meta-approved compatible templates can be sent."
                  : "Choose an email template or leave blank to send your message."}
              </small>
              {channel === "whatsapp" && templates.length === 0 && !templatesLoading && (
                <small className="shr-hint shr-error">
                  No approved compatible template found. Create and approve one first.
                </small>
              )}
            </label>
          )}

          <label className="shr-field">
            <span>{isEmail ? "To (email)" : "To (WhatsApp number)"}</span>
            <div className="shr-input-row">
              {!isEmail && <em className="shr-prefix">+91</em>}
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

          {isEmail && (
            <label className="shr-field">
              <span>Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={sending} />
            </label>
          )}

          <label className="shr-field">
            <span>Message</span>
            <textarea
              rows={isMobileView ? 10 : 9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending || (isBusiness && Boolean(templateId))}
            />
            {isBusiness && templateId && (
              <small className="shr-hint">
                The selected template's approved message body will be sent. This text is shown
                as a local preview only.
              </small>
            )}
          </label>

          {attachPdf && (
            <div className="shr-attachment">
              <Paperclip size={15} />
              <span>{row.deliveryNoteNumber}.pdf</span>
              <small>{isBusiness ? "will be attached" : "attach manually in manual mode"}</small>
            </div>
          )}
        </div>

        <footer className="shr-foot">
          <button type="button" className="shr-btn shr-btn-ghost" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            type="button"
            className={`shr-btn shr-btn-primary shr-${isEmail ? "red" : "green"}`}
            onClick={submit}
            disabled={sending}
          >
            <Send size={16} />
            {sending ? "Sending..." : isEmail ? "Send Email" : "Send on WhatsApp"}
          </button>
        </footer>

        {sending && <SendingAnimation channel={channel} />}
      </div>
    </div>,
    document.body,
  );
}

/* ================================================================
   SHARE BUTTON + MENU
================================================================ */

/**
 * Usage:
 *
 * <ShareDeliveryNoteButton
 *   row={note}
 *   disabled={false}
 *   onSend={async (payload) => {...}}
 * />
 *
 * onSend is optional, same override hook as ShareInvoiceButton.
 */
export default function ShareDeliveryNoteButton({ row, disabled = false, onSend }) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const isMobile = useIsMobile();

  const [menu, setMenu] = useState(null);
  const [active, setActive] = useState(null);

  const isCancelled = row?.status === "CANCELLED";
  const canDispatchNotify = ["DISPATCHED", "DELIVERED"].includes(row?.status);

  useBodyLock(Boolean(menu) && isMobile);

  const reasonDisabled = (action) => {
    if (isCancelled) return "Delivery note is cancelled";

    // "reminder" kind here means the Dispatch Update action.
    if (action.kind === "reminder" && !canDispatchNotify) {
      return "Dispatch the note first";
    }

    return "";
  };

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

    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const top =
      rect.bottom + height > window.innerHeight
        ? Math.max(8, rect.top - height - 6)
        : rect.bottom + 6;

    setMenu({ top, left });
  };

  useEffect(() => {
    if (!menu) return undefined;

    const close = () => setMenu(null);

    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };

    const onKey = (e) => {
      if (e.key === "Escape") close();
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

  const menuContent = (
    <div
      ref={menuRef}
      className={`shr-menu ${isMobile ? "shr-menu-sheet" : ""}`}
      role="menu"
      style={isMobile ? undefined : { top: menu?.top, left: menu?.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {isMobile && <div className="shr-grabber" aria-hidden="true" />}

      <div className="shr-menu-title">
        <div>
          <strong>{row.customerName || "Customer"}</strong>
          <span>{row.deliveryNoteNumber}</span>
        </div>
        {isMobile && (
          <button type="button" className="shr-close" aria-label="Close" onClick={() => setMenu(null)}>
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
            onClick={() => {
              setMenu(null);
              setActive(action);
            }}
          >
            <span className={`shr-item-icon shr-${action.tone}`}>
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

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="shr-trigger"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        aria-label={`Share ${row?.deliveryNoteNumber || "delivery note"}`}
        onClick={toggleMenu}
      >
        <Share2 size={14} strokeWidth={2.5} />
        <span>Share</span>
      </button>

      {menu &&
        createPortal(
          isMobile ? (
            <div className="shr-sheet-overlay" onClick={() => setMenu(null)}>
              {menuContent}
            </div>
          ) : (
            menuContent
          ),
          document.body,
        )}

      {active && (
        <ShareComposeModal row={row} action={active} onClose={() => setActive(null)} onSend={onSend} />
      )}
    </>
  );
}