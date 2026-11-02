import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MessageCircle,
  Mail,
  Hand,
  BadgeCheck,
  Save,
  RotateCcw,
  Download,
  Trash2,
  Send,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  Search,
} from "lucide-react";

import Select from "../../components/common/Form/Select";
import Button from "../../components/common/Form/Button";

import {
  DEFAULT_SETTINGS,
  KIND_LABELS,
  CHANNEL_LABELS,
  useMessagingStore,
  saveSettings,
  clearLog,
  formatInr,
} from "../../utils/messagingStore";

import "./MessagingSettings.css";

const PROVIDERS = [
  { value: "meta", label: "Meta WhatsApp Cloud API" },
  { value: "twilio", label: "Twilio" },
  { value: "gupshup", label: "Gupshup" },
  { value: "other", label: "Other provider" },
];

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

const periodStart = (key) => {
  const now = new Date();
  if (key === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (key === "30d") return new Date(now.getTime() - 30 * 86400000);
  return null;
};

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const sameSettings = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function MessagingSettings() {
  const { settings: saved, log } = useMessagingStore();

  const [draft, setDraft] = useState(saved);
  const [period, setPeriod] = useState("30d");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(25);

  /* Keep the draft in sync when storage changes elsewhere */
  useEffect(() => setDraft(saved), [saved]);

  const hasChanges = !sameSettings(draft, saved);
  const isBusiness = saved.mode === "business";

  /* ---------------- Stats ---------------- */

  const periodLog = useMemo(() => {
    const start = periodStart(period);
    return log.filter((entry) => !start || new Date(entry.at) >= start);
  }, [log, period]);

  const stats = useMemo(() => {
    const sent = periodLog.filter((e) => e.status === "sent");
    const failed = periodLog.filter((e) => e.status === "failed");
    const business = sent.filter((e) => e.mode === "business");
    const spend = business.reduce((sum, e) => sum + (e.costPaise || 0), 0);

    const byRow = {};
    for (const entry of sent) {
      const key = `${entry.channel}:${entry.kind}`;
      byRow[key] ||= { channel: entry.channel, kind: entry.kind, count: 0, cost: 0 };
      byRow[key].count += 1;
      byRow[key].cost += entry.costPaise || 0;
    }

    return {
      total: sent.length,
      whatsapp: sent.filter((e) => e.channel === "whatsapp").length,
      email: sent.filter((e) => e.channel === "email").length,
      failed: failed.length,
      businessCount: business.length,
      manualCount: sent.length - business.length,
      spend,
      average: business.length ? Math.round(spend / business.length) : 0,
      rows: Object.values(byRow).sort((a, b) => b.count - a.count),
    };
  }, [periodLog]);

  const filteredLog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return periodLog;
    return periodLog.filter((e) =>
      [e.customerName, e.customerCode, e.invoiceNumber, e.to]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [periodLog, query]);

  /* ---------------- Actions ---------------- */

  const setMode = (mode) => setDraft((d) => ({ ...d, mode }));

  const setRate = (channel, kind, value) =>
    setDraft((d) => ({
      ...d,
      rates: {
        ...d.rates,
        [channel]: { ...d.rates[channel], [kind]: value === "" ? 0 : Number(value) },
      },
    }));

  const handleSave = (event) => {
    event.preventDefault();

    if (
      draft.mode === "business" &&
      draft.businessNumber &&
      draft.businessNumber.replace(/\D/g, "").length < 10
    ) {
      toast.error("Enter a valid business WhatsApp number.");
      return;
    }

    try {
      saveSettings(draft);
      toast.success("Messaging settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save settings");
    }
  };

  const restoreDefaults = () => {
    setDraft({ ...DEFAULT_SETTINGS });
    toast("Defaults restored. Click Save to keep them.");
  };

  const exportCsv = () => {
    if (!filteredLog.length) {
      toast.error("Nothing to export.");
      return;
    }

    const header = [
      "Date", "Customer", "Customer Code", "Invoice", "Channel",
      "Type", "To", "Mode", "Status", "Cost (INR)",
    ];

    const rows = filteredLog.map((e) => [
      fmtDateTime(e.at),
      e.customerName,
      e.customerCode,
      e.invoiceNumber,
      CHANNEL_LABELS[e.channel] || e.channel,
      KIND_LABELS[e.kind] || e.kind,
      e.to,
      e.mode === "business" ? "Business API" : "Manual",
      e.status,
      ((e.costPaise || 0) / 100).toFixed(2),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "message-usage.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!log.length) return;
    if (window.confirm("Delete the entire sent-message history on this device?")) {
      clearLog();
      toast.success("History cleared");
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="company-settings-page">
      <div className="company-settings-header">
        <div className="page-title-row">
          <div className="page-title-icon">
            <Send size={22} />
          </div>
          <div>
            <h1>Messaging &amp; Share</h1>
            <p>Choose how invoices are sent and track every message and its cost</p>
          </div>
        </div>

        <div className="company-settings-header-actions">
          <Button type="button" variant="secondary" onClick={restoreDefaults}>
            <RotateCcw size={16} />
            Restore Defaults
          </Button>
        </div>
      </div>

      <div className="company-settings-content">
        {/* ---------------- Mode ---------------- */}
        <form onSubmit={handleSave}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">
                <Send size={18} />
              </div>
              <div>
                <h2>Sending Method</h2>
                <p>Applies to every Share button in the app</p>
              </div>
            </div>

            <div className="msg-modes" role="radiogroup" aria-label="Sending method">
              <button
                type="button"
                role="radio"
                aria-checked={draft.mode === "manual"}
                className={`msg-mode ${draft.mode === "manual" ? "active" : ""}`}
                onClick={() => setMode("manual")}
              >
                <span className="msg-mode-icon msg-grey"><Hand size={20} /></span>
                <span className="msg-mode-text">
                  <strong>Manual</strong>
                  <small>
                    Opens your own WhatsApp / Gmail with the message ready. You press
                    send yourself. Free.
                  </small>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={draft.mode === "business"}
                className={`msg-mode ${draft.mode === "business" ? "active" : ""}`}
                onClick={() => setMode("business")}
              >
                <span className="msg-mode-icon msg-green"><BadgeCheck size={20} /></span>
                <span className="msg-mode-text">
                  <strong>Business Account API</strong>
                  <small>
                    Sends automatically from your business account, with the PDF
                    attached. Charged per message.
                  </small>
                </span>
              </button>
            </div>

            {draft.mode === "business" && (
              <>
                <div className="settings-form-grid msg-business-grid">
                  <div>
                    <Select
                      label="Provider"
                      name="provider"
                      value={draft.provider}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, provider: e.target.value }))
                      }
                      options={PROVIDERS}
                    />
                  </div>

                  <div className="msg-input">
                    <label htmlFor="biz-number">Business WhatsApp number</label>
                    <input
                      id="biz-number"
                      type="tel"
                      inputMode="tel"
                      placeholder="+91 98765 43210"
                      value={draft.businessNumber}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, businessNumber: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="msg-notice">
                  <AlertTriangle size={16} />
                  <span>
                    Not connected yet. Messages are counted and costed here, but real
                    delivery starts once the backend connects your provider.
                  </span>
                </div>

                <h3 className="msg-subtitle">Cost per message (₹)</h3>
                <p className="msg-muted">
                  Starting estimates only. Set these to your provider's actual rates.
                  Gmail is usually free.
                </p>

                <div className="msg-table-wrap">
                  <table className="msg-table msg-rates">
                    <thead>
                      <tr>
                        <th>Message type</th>
                        <th>WhatsApp</th>
                        <th>Gmail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(KIND_LABELS).map((kind) => (
                        <tr key={kind}>
                          <td>{KIND_LABELS[kind]}</td>
                          {["whatsapp", "email"].map((channel) => (
                            <td key={channel}>
                              <div className="msg-rate-input">
                                <em>₹</em>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  step="0.01"
                                  value={draft.rates[channel][kind]}
                                  onChange={(e) => setRate(channel, kind, e.target.value)}
                                  aria-label={`${CHANNEL_LABELS[channel]} ${KIND_LABELS[kind]} rate`}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="settings-card-footer">
              <div className="settings-info">
                <BadgeCheck size={16} />
                <span>
                  {hasChanges
                    ? "You have unsaved changes."
                    : `Active: ${isBusiness ? "Business Account API" : "Manual"}`}
                </span>
              </div>

              <Button type="submit" variant="primary" disabled={!hasChanges}>
                <Save size={16} />
                Save Settings
              </Button>
            </div>
          </div>
        </form>

        {/* ---------------- Usage ---------------- */}
        <div className="settings-card">
          <div className="settings-card-header msg-usage-head">
            <div className="settings-card-icon">
              <TrendingUp size={18} />
            </div>
            <div className="msg-grow">
              <h2>Usage &amp; Cost</h2>
              <p>
                {isBusiness
                  ? "Messages sent and money spent on your Business API"
                  : "Messages sent. Switch to Business API to track spend."}
              </p>
            </div>

            <div className="msg-chips" role="tablist" aria-label="Period">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={period === p.key}
                  className={period === p.key ? "active" : ""}
                  onClick={() => {
                    setPeriod(p.key);
                    setVisible(25);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="msg-stats">
            <div className="msg-stat">
              <span className="msg-stat-icon msg-blue"><Send size={18} /></span>
              <div>
                <small>Total sent</small>
                <strong>{stats.total}</strong>
              </div>
            </div>

            <div className="msg-stat">
              <span className="msg-stat-icon msg-green"><MessageCircle size={18} /></span>
              <div>
                <small>WhatsApp</small>
                <strong>{stats.whatsapp}</strong>
              </div>
            </div>

            <div className="msg-stat">
              <span className="msg-stat-icon msg-red"><Mail size={18} /></span>
              <div>
                <small>Gmail</small>
                <strong>{stats.email}</strong>
              </div>
            </div>

            <div className="msg-stat">
              <span className="msg-stat-icon msg-amber"><AlertTriangle size={18} /></span>
              <div>
                <small>Failed</small>
                <strong>{stats.failed}</strong>
              </div>
            </div>

            {isBusiness && (
              <>
                <div className="msg-stat msg-stat-spend">
                  <span className="msg-stat-icon msg-purple"><IndianRupee size={18} /></span>
                  <div>
                    <small>Total spend</small>
                    <strong>{formatInr(stats.spend)}</strong>
                  </div>
                </div>

                <div className="msg-stat">
                  <span className="msg-stat-icon msg-grey"><IndianRupee size={18} /></span>
                  <div>
                    <small>Avg cost / message</small>
                    <strong>{formatInr(stats.average)}</strong>
                  </div>
                </div>

                <div className="msg-stat">
                  <span className="msg-stat-icon msg-green"><BadgeCheck size={18} /></span>
                  <div>
                    <small>Via Business API</small>
                    <strong>{stats.businessCount}</strong>
                  </div>
                </div>

                <div className="msg-stat">
                  <span className="msg-stat-icon msg-grey"><Hand size={18} /></span>
                  <div>
                    <small>Sent manually</small>
                    <strong>{stats.manualCount}</strong>
                  </div>
                </div>
              </>
            )}
          </div>

          <h3 className="msg-subtitle">Breakdown</h3>

          {stats.rows.length ? (
            <div className="msg-table-wrap">
              <table className="msg-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Type</th>
                    <th className="msg-num">Count</th>
                    {isBusiness && <th className="msg-num">Cost</th>}
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map((row) => (
                    <tr key={`${row.channel}-${row.kind}`}>
                      <td>{CHANNEL_LABELS[row.channel]}</td>
                      <td>{KIND_LABELS[row.kind]}</td>
                      <td className="msg-num">{row.count}</td>
                      {isBusiness && <td className="msg-num">{formatInr(row.cost)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="msg-empty">No messages in this period yet.</p>
          )}
        </div>

        {/* ---------------- Log ---------------- */}
        <div className="settings-card">
          <div className="settings-card-header msg-usage-head">
            <div className="settings-card-icon">
              <Send size={18} />
            </div>
            <div className="msg-grow">
              <h2>Sent Messages</h2>
              <p>Every message sent from the Share button on this device</p>
            </div>

            <div className="msg-log-actions">
              <Button type="button" variant="secondary" onClick={exportCsv}>
                <Download size={16} />
                Export
              </Button>
              <Button type="button" variant="secondary" onClick={handleClear}>
                <Trash2 size={16} />
                Clear
              </Button>
            </div>
          </div>

          <div className="msg-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search customer, invoice, number..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(25);
              }}
            />
          </div>

          {filteredLog.length ? (
            <>
              <div className="msg-table-wrap">
                <table className="msg-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Invoice</th>
                      <th>Channel</th>
                      <th>Type</th>
                      <th>To</th>
                      <th>Mode</th>
                      <th>Status</th>
                      {isBusiness && <th className="msg-num">Cost</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLog.slice(0, visible).map((e) => (
                      <tr key={e.id}>
                        <td>{fmtDateTime(e.at)}</td>
                        <td>
                          <strong>{e.customerName || "N/A"}</strong>
                          <small>{e.customerCode}</small>
                        </td>
                        <td>{e.invoiceNumber || "N/A"}</td>
                        <td>{CHANNEL_LABELS[e.channel] || e.channel}</td>
                        <td>{KIND_LABELS[e.kind] || e.kind}</td>
                        <td>{e.to}</td>
                        <td>{e.mode === "business" ? "Business API" : "Manual"}</td>
                        <td>
                          <span className={`msg-pill msg-pill-${e.status}`}>
                            {e.status === "sent" ? "Sent" : "Failed"}
                          </span>
                        </td>
                        {isBusiness && (
                          <td className="msg-num">{formatInr(e.costPaise)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {visible < filteredLog.length && (
                <div className="msg-more">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setVisible((v) => v + 25)}
                  >
                    Show more ({filteredLog.length - visible} left)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="msg-empty">No messages found.</p>
          )}

          <p className="msg-muted msg-foot-note">
            History is stored in this browser only (last 1,000 messages). Costs are
            estimates from your rate card, so your provider's invoice is the final
            figure. In Manual mode a message is logged when the app opens, because the
            app cannot know whether you pressed send.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MessagingSettings;