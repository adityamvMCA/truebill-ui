import { useEffect, useState } from "react";
import { getCurrentTenantContext } from "./tenantContext";

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

/* Rates are in RUPEES per message. They are starting estimates only:
   edit them in Messaging Settings to match your provider's rate card. */
export const DEFAULT_SETTINGS = {
  mode: "manual", // "manual" | "business"
  provider: "meta",
  businessNumber: "",
  rates: {
    whatsapp: { invoice: 0.12, reminder: 0.12, message: 0 },
    email: { invoice: 0, reminder: 0, message: 0 },
  },
};

export const KIND_LABELS = {
  invoice: "Invoice PDF",
  reminder: "Payment Reminder",
  message: "Normal Message",
};

export const CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  email: "Gmail",
};

const EVENT = "messaging-store-change";
const MAX_LOG = 1000;

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

const tenantKey = () => {
  try {
    const { tenantId } = getCurrentTenantContext();
    return tenantId || "local";
  } catch {
    return "local";
  }
};

const settingsKey = () => `messagingSettings:${tenantKey()}`;
const logKey = () => `messagingLog:${tenantKey()}`;

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const mergeSettings = (stored) => {
  const s = stored && typeof stored === "object" ? stored : {};
  const rates = {};

  for (const channel of Object.keys(DEFAULT_SETTINGS.rates)) {
    rates[channel] = {};
    for (const kind of Object.keys(DEFAULT_SETTINGS.rates[channel])) {
      rates[channel][kind] = num(
        s.rates?.[channel]?.[kind],
        DEFAULT_SETTINGS.rates[channel][kind],
      );
    }
  }

  return {
    mode: s.mode === "business" ? "business" : "manual",
    provider: s.provider || DEFAULT_SETTINGS.provider,
    businessNumber: String(s.businessNumber || ""),
    rates,
  };
};

export const readSettings = () => {
  try {
    return mergeSettings(JSON.parse(localStorage.getItem(settingsKey()) || "{}"));
  } catch {
    return mergeSettings({});
  }
};

export const readLog = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(logKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const notify = () => window.dispatchEvent(new Event(EVENT));

export const saveSettings = (settings) => {
  localStorage.setItem(settingsKey(), JSON.stringify(mergeSettings(settings)));
  notify();
};

export const addLogEntry = (entry) => {
  try {
    const next = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        ...entry,
      },
      ...readLog(),
    ].slice(0, MAX_LOG);

    localStorage.setItem(logKey(), JSON.stringify(next));
    notify();
  } catch (error) {
    console.warn("Unable to store message log:", error);
  }
};

export const clearLog = () => {
  localStorage.removeItem(logKey());
  notify();
};

/* ------------------------------------------------------------------ */
/* Cost                                                                */
/* ------------------------------------------------------------------ */

/* Manual mode costs nothing. Business mode uses the rate card. */
export const calcCostPaise = (settings, channel, kind) => {
  if (settings.mode !== "business") return 0;
  const rate = settings.rates?.[channel]?.[kind] ?? 0;
  return Math.round(rate * 100);
};

export const formatInr = (paise, digits = 2) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, 2),
  }).format((Number(paise) || 0) / 100);

/* ------------------------------------------------------------------ */
/* React hook                                                          */
/* ------------------------------------------------------------------ */

export const useMessagingStore = () => {
  const [state, setState] = useState(() => ({
    settings: readSettings(),
    log: readLog(),
  }));

  useEffect(() => {
    const sync = () => setState({ settings: readSettings(), log: readLog() });

    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return state;
};