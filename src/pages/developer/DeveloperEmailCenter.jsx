import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code,
  CreditCard,
  Eye,
  History,
  Lock,
  Mail,
  RefreshCw,
  Send,
  Shield,
  Smartphone,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import developerEmailApi from "../../services/modules/developerEmailApi";
import useAuth from "../../hooks/useAuth";

export default function DeveloperEmailCenter() {
  const { user } = useAuth();
  const isDeveloper = user?.platformRole === "developer";

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("WELCOME_EMAIL");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeViewTab, setActiveViewTab] = useState("preview"); // "preview" | "payload" | "logs"
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"

  const [previewData, setPreviewData] = useState({ subject: "", html: "" });
  const [previewLoading, setPreviewLoading] = useState(false);

  const [payloadText, setPayloadText] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [runningLifecycle, setRunningLifecycle] = useState(false);

  // Delivery logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load templates on mount
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await developerEmailApi.getTemplates();
      const list = res?.data?.data || res?.data || [];
      setTemplates(list);

      if (list.length > 0 && !selectedType) {
        setSelectedType(list[0].type);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load email templates");
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Selected template object
  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.type === selectedType) || templates[0];
  }, [templates, selectedType]);

  // Update payload text when selected template changes
  useEffect(() => {
    if (selectedTemplate?.sampleData) {
      setPayloadText(JSON.stringify(selectedTemplate.sampleData, null, 2));
    }
  }, [selectedTemplate]);

  // Set default recipient to current user's email
  useEffect(() => {
    if (user?.email && !recipientEmail) {
      setRecipientEmail(user.email);
    }
  }, [user, recipientEmail]);

  // Load preview whenever selected template or payload text changes
  const updatePreview = useCallback(async () => {
    if (!selectedType) return;
    try {
      setPreviewLoading(true);
      let parsedData = {};
      try {
        parsedData = payloadText ? JSON.parse(payloadText) : {};
      } catch {
        // Fallback to sample data if JSON invalid
        parsedData = selectedTemplate?.sampleData || {};
      }

      const res = await developerEmailApi.preview(selectedType, parsedData);
      setPreviewData(res?.data?.data || { subject: "", html: "" });
    } catch (err) {
      console.error("Preview render failed:", err);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedType, payloadText, selectedTemplate]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Load logs
  const loadLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const res = await developerEmailApi.getLogs({ limit: 50 });
      setLogs(res?.data?.data || []);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeViewTab === "logs") {
      loadLogs();
    }
  }, [activeViewTab, loadLogs]);

  // Send Test Email
  const handleSendTestEmail = async (e) => {
    e?.preventDefault?.();
    if (!recipientEmail?.trim()) {
      toast.error("Please enter a recipient email address");
      return;
    }

    let parsedData = {};
    try {
      parsedData = payloadText ? JSON.parse(payloadText) : {};
    } catch {
      toast.error("Invalid JSON payload format");
      return;
    }

    try {
      setSending(true);
      const res = await developerEmailApi.send({
        type: selectedType,
        to: recipientEmail.trim(),
        data: parsedData,
      });

      toast.success(res?.data?.message || "Email delivered successfully via SMTP!");
      if (activeViewTab === "logs") {
        loadLogs();
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send email. Check SMTP credentials.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleResetPayload = () => {
    if (selectedTemplate?.sampleData) {
      setPayloadText(JSON.stringify(selectedTemplate.sampleData, null, 2));
      toast.success("Payload reset to default sample data");
    }
  };

  const handleRunLifecycleCheck = async () => {
    try {
      setRunningLifecycle(true);
      const res = await developerEmailApi.runLifecycleCheck();
      const s = res?.data?.summary || {};
      const totalSent =
        (s.trialExpiringSoonDispatched || 0) +
        (s.trialExpiredDispatched || 0) +
        (s.renewalReminderDispatched || 0) +
        (s.subscriptionExpiredDispatched || 0);
      toast.success(
        `Lifecycle Check Done: ${s.evaluatedTenants || 0} evaluated, ${totalSent} notice(s) sent, ${s.skippedAlreadySentToday || 0} already sent today.`,
        { duration: 6000 },
      );
      if (activeViewTab === "logs") {
        loadLogs();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to execute lifecycle check");
    } finally {
      setRunningLifecycle(false);
    }
  };

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (activeCategory === "BILLING") {
      return templates.filter((t) => t.category === "Subscription & Billing");
    }
    if (activeCategory === "SECURITY") {
      return templates.filter((t) => t.category === "Account & Security");
    }
    return templates;
  }, [templates, activeCategory]);

  if (!isDeveloper) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <Shield size={48} style={{ color: "#ef4444", marginBottom: "16px" }} />
        <h2>Developer Access Required</h2>
        <p style={{ color: "#64748b" }}>
          Only accounts with the platformRole <code>developer</code> have permissions to manage automated email templates and manual test dispatching.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1500px", margin: "0 auto", color: "var(--text-main, #1e293b)" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#dbeafe", padding: "8px", borderRadius: "8px", color: "#2563eb", display: "flex" }}>
              <Mail size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>
                Automated Lifecycle Email Engine
              </h1>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                Reusable lifecycle templates for subscriptions, payments, and account security. Restricted to Developer role.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "9999px", fontWeight: 600 }}>
            Developer Portal
          </span>
          <button
            type="button"
            onClick={handleRunLifecycleCheck}
            disabled={runningLifecycle}
            title="Evaluate trial & subscription expiration dates for all tenants and send automated reminder/expired emails"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "6px",
              border: "1px solid #93c5fd",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 600,
              fontSize: "13px",
              cursor: runningLifecycle ? "not-allowed" : "pointer",
            }}
          >
            <Clock size={14} className={runningLifecycle ? "animate-spin" : ""} />
            {runningLifecycle ? "Checking Dates…" : "Run Date Lifecycle Check"}
          </button>
          <button
            type="button"
            onClick={updatePreview}
            disabled={previewLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={previewLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start" }}>
        {/* LEFT COLUMN: TEMPLATES DIRECTORY */}
        <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 170px)" }}>
          {/* Category Filter Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", padding: "8px" }}>
            {[
              ["ALL", `All (${templates.length})`],
              ["BILLING", "Billing (13)"],
              ["SECURITY", "Security (9)"],
            ].map(([cat, label]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: "12px",
                  fontWeight: activeCategory === cat ? 700 : 500,
                  border: "none",
                  borderRadius: "6px",
                  background: activeCategory === cat ? "#ffffff" : "transparent",
                  color: activeCategory === cat ? "#2563eb" : "#64748b",
                  boxShadow: activeCategory === cat ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Templates Scroll List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {loading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                Loading templates...
              </div>
            ) : (
              filteredTemplates.map((t) => {
                const isSelected = t.type === selectedType;
                const isBilling = t.category === "Subscription & Billing";
                return (
                  <div
                    key={t.type}
                    onClick={() => setSelectedType(t.type)}
                    style={{
                      padding: "12px 14px",
                      marginBottom: "6px",
                      borderRadius: "8px",
                      border: isSelected ? "1px solid #93c5fd" : "1px solid transparent",
                      background: isSelected ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: isSelected ? "#1e40af" : "#1e293b" }}>
                        {t.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: isBilling ? "#dcfce7" : "#ede9fe",
                          color: isBilling ? "#166534" : "#5b21b6",
                        }}
                      >
                        {isBilling ? "Billing" : "Security"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
                      {t.description}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW, PAYLOAD & TEST SEND */}
        <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 170px)" }}>
          {/* Action & View Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setActiveViewTab("preview")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: activeViewTab === "preview" ? "#2563eb" : "transparent",
                  color: activeViewTab === "preview" ? "#ffffff" : "#475569",
                }}
              >
                <Eye size={15} />
                HTML Preview
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab("payload")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: activeViewTab === "payload" ? "#2563eb" : "transparent",
                  color: activeViewTab === "payload" ? "#ffffff" : "#475569",
                }}
              >
                <Code size={15} />
                Sample Payload JSON
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab("logs")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: activeViewTab === "logs" ? "#2563eb" : "transparent",
                  color: activeViewTab === "logs" ? "#ffffff" : "#475569",
                }}
              >
                <History size={15} />
                Delivery Logs
              </button>
            </div>

            {activeViewTab === "preview" && (
              <div style={{ display: "flex", background: "#e2e8f0", borderRadius: "6px", padding: "2px" }}>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  style={{
                    padding: "4px 10px",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: previewDevice === "desktop" ? "#ffffff" : "transparent",
                    color: previewDevice === "desktop" ? "#0f172a" : "#64748b",
                  }}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: previewDevice === "mobile" ? "#ffffff" : "transparent",
                    color: previewDevice === "mobile" ? "#0f172a" : "#64748b",
                  }}
                >
                  <Smartphone size={12} />
                  Mobile (375px)
                </button>
              </div>
            )}
          </div>

          {/* DISPATCH ACTION BAR (Always visible at top of right panel) */}
          <div style={{ padding: "12px 20px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
              Send Test Email:
            </span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Recipient email address (e.g. dev@trustiq.in)"
              style={{
                flex: "1",
                minWidth: "220px",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "6px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: sending ? "not-allowed" : "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <Send size={14} />
              {sending ? "Dispatching via SMTP..." : "Send Test Email"}
            </button>
          </div>

          {/* CONTENT AREA */}
          <div style={{ flex: 1, overflowY: "auto", position: "relative", background: activeViewTab === "preview" ? "#e2e8f0" : "#ffffff" }}>
            {/* VIEW TAB 1: PREVIEW */}
            {activeViewTab === "preview" && (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Subject Preview Header */}
                <div
                  style={{
                    width: previewDevice === "mobile" ? "375px" : "620px",
                    maxWidth: "100%",
                    background: "#ffffff",
                    borderRadius: "8px 8px 0 0",
                    border: "1px solid #cbd5e1",
                    borderBottom: "2px solid #e2e8f0",
                    padding: "12px 18px",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                    Subject Line
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {previewData.subject || "Loading subject..."}
                  </div>
                </div>

                {/* HTML Iframe */}
                <iframe
                  title="Email Preview"
                  srcDoc={previewData.html}
                  style={{
                    width: previewDevice === "mobile" ? "375px" : "620px",
                    maxWidth: "100%",
                    height: "680px",
                    border: "1px solid #cbd5e1",
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",
                    backgroundColor: "#f1f5f9",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </div>
            )}

            {/* VIEW TAB 2: JSON PAYLOAD */}
            {activeViewTab === "payload" && (
              <div style={{ padding: "20px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                      Template Payload Parameters (JSON)
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                      Edit the parameters below to customize variables for <code>{selectedType}</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetPayload}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Reset to Default Sample
                  </button>
                </div>

                <textarea
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                  style={{
                    flex: 1,
                    width: "100%",
                    fontFamily: "Consolas, Monaco, monospace",
                    fontSize: "13px",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#0f172a",
                    color: "#f8fafc",
                    lineHeight: "1.5",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {/* VIEW TAB 3: DELIVERY LOGS */}
            {activeViewTab === "logs" && (
              <div style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                    Recent Email Dispatches
                  </h3>
                  <button
                    type="button"
                    onClick={loadLogs}
                    disabled={logsLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={12} className={logsLoading ? "animate-spin" : ""} />
                    Refresh Logs
                  </button>
                </div>

                {logsLoading ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    Loading dispatch logs...
                  </div>
                ) : logs.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    No emails logged yet. Click &quot;Send Test Email&quot; above to dispatch your first notification.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "10px 14px", color: "#64748b" }}>Timestamp</th>
                        <th style={{ padding: "10px 14px", color: "#64748b" }}>Recipient</th>
                        <th style={{ padding: "10px 14px", color: "#64748b" }}>Template Type</th>
                        <th style={{ padding: "10px 14px", color: "#64748b" }}>Status</th>
                        <th style={{ padding: "10px 14px", color: "#64748b" }}>Triggered By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                            {new Date(log.sentAt || log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{log.to}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <code style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                              {log.templateType}
                            </code>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: log.status === "SENT" ? "#dcfce7" : "#fee2e2",
                                color: log.status === "SENT" ? "#166534" : "#991b1b",
                              }}
                            >
                              {log.status}
                            </span>
                            {log.error && (
                              <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
                                {log.error}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px" }}>
                            {log.triggeredBy || "SYSTEM"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
