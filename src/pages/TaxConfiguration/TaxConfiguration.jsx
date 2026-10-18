import { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import api from "../../services/api";

const GST_RATES = [0, 5, 12, 18, 28];

const REGISTRATION_TYPES = [
  { value: "REGULAR", label: "Regular" },
  { value: "COMPOSITION", label: "Composition" },
  { value: "UNREGISTERED", label: "Unregistered" },
];

const OUTPUT_FIELDS = [
  {
    name: "outputCgstLedgerId",
    label: "Output CGST",
    hint: "Credited on intra-state sales",
    match: ["output", "cgst"],
  },
  {
    name: "outputSgstLedgerId",
    label: "Output SGST",
    hint: "Credited on intra-state sales",
    match: ["output", "sgst"],
  },
  {
    name: "outputIgstLedgerId",
    label: "Output IGST",
    hint: "Credited on inter-state sales",
    match: ["output", "igst"],
  },
];

const INPUT_FIELDS = [
  {
    name: "inputCgstLedgerId",
    label: "Input CGST",
    hint: "Debited on intra-state purchases",
    match: ["input", "cgst"],
  },
  {
    name: "inputSgstLedgerId",
    label: "Input SGST",
    hint: "Debited on intra-state purchases",
    match: ["input", "sgst"],
  },
  {
    name: "inputIgstLedgerId",
    label: "Input IGST",
    hint: "Debited on inter-state purchases",
    match: ["input", "igst"],
  },
];

const ALL_LEDGER_FIELDS = [...OUTPUT_FIELDS, ...INPUT_FIELDS];

const emptyForm = {
  registrationType: "REGULAR",
  gstin: "",
  stateCode: "",
  defaultGstRate: "18",
  outputCgstLedgerId: "",
  outputSgstLedgerId: "",
  outputIgstLedgerId: "",
  inputCgstLedgerId: "",
  inputSgstLedgerId: "",
  inputIgstLedgerId: "",
};

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const colors = {
  card: "var(--bg-card, #ffffff)",
  border: "var(--border-color, #e5e7eb)",
  muted: "var(--text-secondary, #6b7280)",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
};

const styles = `
.tc-page {
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  padding: 24px;
}

.tc-title {
  margin: 0;
  font-size: 22px;
}

.tc-subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: ${colors.muted};
}

.tc-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 14px;
  margin: 20px 0;
}

.tc-stat {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 16px 18px;
  background: ${colors.card};
  border: 1px solid ${colors.border};
  border-radius: 12px;
}

.tc-stat-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}

.tc-stat-label {
  font-size: 12px;
  color: ${colors.muted};
}

.tc-stat-value {
  font-size: 17px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.tc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 18px;
  align-items: start;
}

.tc-grid > * {
  min-width: 0;
}

.tc-section-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.tc-section-header-content {
  flex: 1;
  min-width: 0;
}

.tc-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.tc-select {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  font-size: 14px;
  color: inherit;
  background: ${colors.card};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
  text-overflow: ellipsis;
}

.tc-select:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.tc-hint {
  font-size: 12px;
  color: ${colors.muted};
  margin-top: 5px;
}

.tc-error {
  color: ${colors.danger};
  font-size: 12px;
  margin: 12px 0 0;
}

.tc-footer {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  padding: 14px 0;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  background: ${colors.card};
  border-top: 1px solid ${colors.border};
}

.tc-footer-status {
  font-size: 13px;
}

.tc-footer-actions {
  display: flex;
  gap: 10px;
}

@media (min-width: 1600px) {
  .tc-page {
    padding: 32px 40px;
  }
}

@media (max-width: 768px) {
  .tc-page {
    padding: 14px;
  }

  .tc-title {
    font-size: 19px;
  }

  .tc-subtitle {
    font-size: 13px;
  }

  .tc-stats {
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 14px 0;
  }

  .tc-stat {
    padding: 12px 14px;
  }

  .tc-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .tc-select {
    height: 44px;
    font-size: 16px;
  }

  .tc-header-action {
    width: 100%;
  }

  .tc-header-action button {
    width: 100%;
    justify-content: center;
  }

  .tc-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .tc-footer-status {
    text-align: center;
  }

  .tc-footer-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .tc-footer-actions button {
    width: 100%;
  }
}
`;

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return error?.message || "Something went wrong. Please try again.";
};

const toForm = (configuration) => {
  if (!configuration) return { ...emptyForm };

  const form = {
    ...emptyForm,
    registrationType: configuration.registrationType || "REGULAR",
    gstin: configuration.gstin || "",
    stateCode: configuration.stateCode || "",
    defaultGstRate: String(configuration.defaultGstRate ?? 18),
  };

  for (const field of ALL_LEDGER_FIELDS) {
    form[field.name] = configuration[field.name]
      ? String(configuration[field.name])
      : "";
  }

  return form;
};

const findLedger = (ledgers, words) =>
  ledgers.find((ledger) => {
    const text = `${ledger.code} ${ledger.name}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });

function StatCard({ icon, label, value, tone }) {
  return (
    <div className="tc-stat">
      <div
        className="tc-stat-icon"
        style={{ color: tone, background: `${tone}1a` }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="tc-stat-label">{label}</div>
        <div className="tc-stat-value">{value}</div>
      </div>
    </div>
  );
}

function SelectField({ id, label, hint, children, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="tc-label">
        {label}
      </label>

      <select id={id} name={id} className="tc-select" {...props}>
        {children}
      </select>

      {hint && <div className="tc-hint">{hint}</div>}
    </div>
  );
}

function LedgerSelect({ field, value, onChange, ledgers, usedIds, disabled }) {
  return (
    <SelectField
      id={field.name}
      label={field.label}
      hint={field.hint}
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{ borderColor: value ? colors.success : colors.border }}
    >
      <option value="">Not mapped</option>

      {ledgers.map((ledger) => {
        const id = String(ledger._id);

        return (
          <option
            key={id}
            value={id}
            disabled={usedIds.has(id) && id !== value}
          >
            {ledger.code} · {ledger.name}
          </option>
        );
      })}
    </SelectField>
  );
}

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div className="box-modal-section-header tc-section-header">
      <div className="box-modal-section-icon">{icon}</div>

      <div className="box-modal-section-header-content tc-section-header-content">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      {action && <div className="tc-header-action">{action}</div>}
    </div>
  );
}

function TaxConfiguration() {
  const [form, setForm] = useState(emptyForm);
  const [savedForm, setSavedForm] = useState(emptyForm);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isUnregistered = form.registrationType === "UNREGISTERED";

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.taxConfiguration.get();
      const data = response?.data;

      const next = toForm(data?.configuration);

      setLedgers(Array.isArray(data?.ledgers) ? data.ledgers : []);
      setForm(next);
      setSavedForm(next);
    } catch (error) {
      console.error("Unable to load tax configuration:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mappedCount = useMemo(
    () => ALL_LEDGER_FIELDS.filter((field) => form[field.name]).length,
    [form],
  );

  const usedIds = useMemo(
    () =>
      new Set(
        ALL_LEDGER_FIELDS.map((field) => form[field.name]).filter(Boolean),
      ),
    [form],
  );

  const outputReady = OUTPUT_FIELDS.every((field) => form[field.name]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const gstinValid = isUnregistered || GSTIN_REGEX.test(form.gstin);

  const derivedStateCode = isUnregistered
    ? form.stateCode
    : form.gstin.slice(0, 2);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "gstin" ? value.toUpperCase().trim() : value,
    }));
  };

  const handleAutoDetect = () => {
    let matched = 0;

    setForm((previous) => {
      const next = { ...previous };
      const taken = new Set();

      for (const field of ALL_LEDGER_FIELDS) {
        if (next[field.name]) {
          taken.add(next[field.name]);
          continue;
        }

        const ledger = findLedger(ledgers, field.match);
        const id = ledger ? String(ledger._id) : "";

        if (id && !taken.has(id)) {
          next[field.name] = id;
          taken.add(id);
          matched += 1;
        }
      }

      return next;
    });

    setTimeout(() => {
      if (matched > 0) {
        toast.success(`Matched ${matched} ledger(s). Review and save.`);
      } else {
        toast("No matching ledgers found. Select them manually.");
      }
    }, 0);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!isUnregistered && !gstinValid) {
      toast.error("Enter a valid 15-character GSTIN");
      return;
    }

    const payload = {
      registrationType: form.registrationType,
      gstin: isUnregistered ? null : form.gstin,
      stateCode: derivedStateCode || null,
      defaultGstRate: Number(form.defaultGstRate),
    };

    for (const field of ALL_LEDGER_FIELDS) {
      payload[field.name] = form[field.name] || null;
    }

    try {
      setSaving(true);

      const response = await api.taxConfiguration.save(payload);
      const next = toForm(response?.data?.configuration);

      setForm(next);
      setSavedForm(next);

      toast.success("Tax configuration saved successfully");
    } catch (error) {
      console.error("Unable to save tax configuration:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;

  return (
    <div className="tc-page">
      <style>{styles}</style>

      <div>
        <h2 className="tc-title">Tax Configuration</h2>
        <p className="tc-subtitle">
          Map your GST ledgers once. Returns and invoices use these mappings
          when posting tax to the books.
        </p>
      </div>

      <div className="tc-stats">
        <StatCard
          icon={<Landmark size={20} />}
          label="Registration"
          value={
            REGISTRATION_TYPES.find(
              (type) => type.value === form.registrationType,
            )?.label
          }
          tone="#2563eb"
        />

        <StatCard
          icon={<ReceiptText size={20} />}
          label="Ledgers mapped"
          value={`${mappedCount} of ${ALL_LEDGER_FIELDS.length}`}
          tone={
            mappedCount === ALL_LEDGER_FIELDS.length
              ? colors.success
              : colors.warning
          }
        />

        <StatCard
          icon={<ShieldCheck size={20} />}
          label="GST posting"
          value={outputReady ? "Ready" : "Output ledgers missing"}
          tone={outputReady ? colors.success : colors.danger}
        />
      </div>

      <div className="box-modal-section">
        <SectionHeader
          icon={<Landmark size={17} />}
          title="Business GST Details"
          subtitle="Registration type, GSTIN and default rate"
        />

        <div className="tc-grid">
          <SelectField
            id="registrationType"
            label="Registration Type"
            value={form.registrationType}
            onChange={handleChange}
            disabled={busy}
          >
            {REGISTRATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </SelectField>

          <Input
            label="GSTIN"
            name="gstin"
            value={form.gstin}
            onChange={handleChange}
            placeholder="29ABCDE1234F1Z5"
            maxLength={15}
            disabled={busy || isUnregistered}
            required={!isUnregistered}
          />

          <Input
            label="State Code"
            name="stateCode"
            value={derivedStateCode}
            onChange={handleChange}
            placeholder="29"
            maxLength={2}
            disabled={busy || !isUnregistered}
          />

          <SelectField
            id="defaultGstRate"
            label="Default GST Rate"
            value={form.defaultGstRate}
            onChange={handleChange}
            disabled={busy}
          >
            {GST_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}%
              </option>
            ))}
          </SelectField>
        </div>

        {!isUnregistered && form.gstin && !gstinValid && (
          <p className="tc-error">
            GSTIN format is invalid. It must be 15 characters, for example
            29ABCDE1234F1Z5.
          </p>
        )}
      </div>

      <div className="box-modal-section">
        <SectionHeader
          icon={<ReceiptText size={17} />}
          title="Output Tax Ledgers"
          subtitle="GST collected on sales (liability)"
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={handleAutoDetect}
              disabled={busy || !ledgers.length}
            >
              <Sparkles size={15} style={{ marginRight: 6 }} />
              Auto-detect
            </Button>
          }
        />

        <div className="tc-grid">
          {OUTPUT_FIELDS.map((field) => (
            <LedgerSelect
              key={field.name}
              field={field}
              value={form[field.name]}
              onChange={handleChange}
              ledgers={ledgers}
              usedIds={usedIds}
              disabled={busy}
            />
          ))}
        </div>
      </div>

      <div className="box-modal-section">
        <SectionHeader
          icon={<ReceiptText size={17} />}
          title="Input Tax Ledgers"
          subtitle="GST paid on purchases (credit available)"
        />

        <div className="tc-grid">
          {INPUT_FIELDS.map((field) => (
            <LedgerSelect
              key={field.name}
              field={field}
              value={form[field.name]}
              onChange={handleChange}
              ledgers={ledgers}
              usedIds={usedIds}
              disabled={busy}
            />
          ))}
        </div>
      </div>

      <div className="tc-footer">
        <span
          className="tc-footer-status"
          style={{ color: isDirty ? colors.warning : colors.muted }}
        >
          {isDirty ? "You have unsaved changes" : "All changes saved"}
        </span>

        <div className="tc-footer-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setForm(savedForm)}
            disabled={busy || !isDirty}
          >
            Reset
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={busy || !isDirty}
          >
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TaxConfiguration;