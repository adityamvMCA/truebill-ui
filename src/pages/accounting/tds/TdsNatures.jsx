
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import tdsApi from "../../../services/modules/tdsApi";
import ledgerApi from "../../../services/modules/ledgerApi";
import { formatDate, money, rupeesToPaise } from "../Note/noteUtils";
import { RATE_TYPES, errMsg, todayInput } from "./tdsUtils";

import "../Note/Notes.css";
import "./Tds.css";

const emptyRate = () => ({
  deducteeType: "ALL",
  withPan: "",
  withoutPan: "",
});

const optionalPaise = (value) => {
  if (String(value).trim() === "") return 0;
  return rupeesToPaise(value);
};

const extractArray = (response, key) => {
  const body = response?.data;

  const candidates = [
    body?.data,
    body?.[key],
    body?.data?.[key],
    body,
  ];

  return candidates.find(Array.isArray) || [];
};

const normalize = (value) =>
  String(value ?? "").trim().toUpperCase();

export default function TdsNatures() {
  const navigate = useNavigate();

  const [natures, setNatures] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [section, setSection] = useState("");
  const [name, setName] = useState("");
  const [paymentCode, setPaymentCode] = useState("");
  const [tdsLedgerId, setTdsLedgerId] = useState("");
  const [rates, setRates] = useState([emptyRate()]);
  const [singleLimit, setSingleLimit] = useState("");
  const [annualLimit, setAnnualLimit] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayInput);

  // Load TDS natures and ledgers directly from their respective APIs.
  const load = useCallback(async () => {
    setLoading(true);
    setLedgerLoading(true);

    try {
      const [natureResult, ledgerResult] = await Promise.allSettled([
        tdsApi.getNatures(),
        ledgerApi.getAll({}),
      ]);

      if (natureResult.status === "fulfilled") {
        const natureList = extractArray(
          natureResult.value,
          "natures",
        );
        setNatures(natureList);
      } else {
        toast.error(
          errMsg(
            natureResult.reason,
            "Unable to load TDS natures.",
          ),
        );
      }

      if (ledgerResult.status === "fulfilled") {
        const ledgerList = extractArray(
          ledgerResult.value,
          "ledgers",
        );

        setLedgers(ledgerList);

        if (ledgerList.length === 0) {
          console.warn(
            "Ledger API returned no ledgers:",
            ledgerResult.value?.data,
          );
        }
      } else {
        setLedgers([]);
        toast.error(
          errMsg(
            ledgerResult.reason,
            "Unable to load accounting ledgers.",
          ),
        );
      }
    } catch (loadError) {
      toast.error(
        errMsg(loadError, "Unable to load TDS data."),
      );
    } finally {
      setLoading(false);
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Include every active TAX liability ledger.
  // Do not filter by the ledger name, because a valid TDS ledger
  // might have a different name.
  const taxLedgers = useMemo(
    () =>
      ledgers.filter(
        (ledger) =>
          normalize(ledger.type) === "TAX" &&
          normalize(ledger.nature) === "LIABILITY" &&
          ledger.isActive !== false,
      ),
    [ledgers],
  );

  const ledgerName = (id) => {
    const ledger = ledgers.find(
      (item) => String(item._id) === String(id?._id ?? id),
    );

    return ledger?.name || "-";
  };

  const patchRate = (index, patch) => {
    setRates((current) =>
      current.map((rate, rowIndex) =>
        rowIndex === index ? { ...rate, ...patch } : rate,
      ),
    );
  };

  const resetForm = () => {
    setSection("");
    setName("");
    setPaymentCode("");
    setTdsLedgerId("");
    setRates([emptyRate()]);
    setSingleLimit("");
    setAnnualLimit("");
    setEffectiveFrom(todayInput());
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    if (saving) return;

    const single = optionalPaise(singleLimit);
    const annual = optionalPaise(annualLimit);

    let problem = "";

    if (!section.trim()) {
      problem = "Enter the section.";
    } else if (!name.trim()) {
      problem = "Enter a name.";
    } else if (
      !taxLedgers.some(
        (ledger) => String(ledger._id) === String(tdsLedgerId),
      )
    ) {
      problem = "Choose a valid active TDS payable ledger.";
    } else if (single === null || annual === null) {
      problem = "Limits must be valid amounts (up to 2 decimals).";
    } else if (
      rates.some(
        (rate) =>
          rate.withPan.trim() === "" ||
          rate.withoutPan.trim() === "" ||
          !Number.isFinite(Number(rate.withPan)) ||
          !Number.isFinite(Number(rate.withoutPan)) ||
          Number(rate.withPan) < 0 ||
          Number(rate.withoutPan) < 0,
      )
    ) {
      problem = "Enter valid rates with and without PAN on every row.";
    } else if (
      new Set(rates.map((rate) => rate.deducteeType)).size !==
      rates.length
    ) {
      problem = "Each deductee type can appear only once.";
    } else if (!effectiveFrom) {
      problem = "Select the effective date.";
    }

    setError(problem);

    if (problem) return;

    setSaving(true);

    try {
      await tdsApi.createNature({
        section: section.trim(),
        name: name.trim(),
        paymentCode: paymentCode.trim() || null,
        tdsLedgerId,
        singleThresholdPaise: single,
        annualThresholdPaise: annual,
        effectiveFrom,
        rates: rates.map((rate) => ({
          deducteeType: rate.deducteeType,
          withPanPercent: Number(rate.withPan),
          withoutPanPercent: Number(rate.withoutPan),
        })),
      });

      toast.success("Nature of payment saved.");
      resetForm();
      setShowForm(false);

      await load();
    } catch (saveError) {
      const message = errMsg(
        saveError,
        "Unable to save nature of payment.",
      );

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>TDS Nature of Payment</h1>
          <p>
            Sections, rates and thresholds used when deducting tax
          </p>
        </div>

        <div className="td-head-actions">
          <button
            type="button"
            className="dl-tool"
            onClick={() => navigate("/accounting/tds")}
          >
            <ArrowLeft size={14} /> Register
          </button>

          <button
            type="button"
            className="so-primary-button dl-add-button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setError("");
              } else {
                setShowForm(true);
                setError("");
                void load();
              }
            }}
          >
            <Plus size={14} />
            {showForm ? "Close" : "New Nature"}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="cn-form" onSubmit={submit} noValidate>
          {error && (
            <div className="cn-error" role="alert">
              {error}
            </div>
          )}

          <section className="dl-card cn-section">
            <h3>Section</h3>

            <div className="cn-grid">
              <div className="dl-field">
                <label htmlFor="tn-section">Section</label>
                <input
                  id="tn-section"
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                />
              </div>

              <div className="dl-field">
                <label htmlFor="tn-name">Name</label>
                <input
                  id="tn-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="dl-field">
                <label htmlFor="tn-code">
                  Payment code (optional)
                </label>
                <input
                  id="tn-code"
                  value={paymentCode}
                  onChange={(event) =>
                    setPaymentCode(event.target.value)
                  }
                />
              </div>

              <div className="dl-field">
                <label htmlFor="tn-ledger">
                  TDS payable ledger
                </label>

                <select
                  id="tn-ledger"
                  value={tdsLedgerId}
                  onChange={(event) =>
                    setTdsLedgerId(event.target.value)
                  }
                  disabled={ledgerLoading}
                >
                  <option value="">
                    {ledgerLoading
                      ? "Loading ledgers..."
                      : taxLedgers.length
                        ? "Select ledger"
                        : "No tax liability ledgers found"}
                  </option>

                  {taxLedgers.map((ledger) => (
                    <option key={ledger._id} value={ledger._id}>
                      {ledger.name} ({ledger.code})
                    </option>
                  ))}
                </select>

                <span className="cn-hint">
                  Select an active Tax ledger under a Liability group.
                </span>

                {!ledgerLoading && taxLedgers.length === 0 && (
                  <button
                    type="button"
                    className="dl-tool"
                    onClick={() => void load()}
                    style={{ marginTop: 8 }}
                  >
                    Retry loading ledgers
                  </button>
                )}
              </div>

              <div className="dl-field">
                <label htmlFor="tn-from">Effective from</label>
                <input
                  id="tn-from"
                  type="date"
                  value={effectiveFrom}
                  onChange={(event) =>
                    setEffectiveFrom(event.target.value)
                  }
                />
              </div>
            </div>
          </section>

          <section className="dl-card cn-section">
            <h3>Rates</h3>

            <div className="dl-table-wrapper">
              <table className="dl-table cn-lines">
                <thead>
                  <tr>
                    <th>Deductee type</th>
                    <th className="gs-num">Rate with PAN (%)</th>
                    <th className="gs-num">
                      Rate without PAN (%)
                    </th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {rates.map((rate, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          aria-label={`Row ${index + 1} deductee type`}
                          value={rate.deducteeType}
                          onChange={(event) =>
                            patchRate(index, {
                              deducteeType: event.target.value,
                            })
                          }
                        >
                          {RATE_TYPES.map((type) => (
                            <option
                              key={type.value}
                              value={type.value}
                            >
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          className="gs-num"
                          inputMode="decimal"
                          aria-label={`Row ${index + 1} rate with PAN`}
                          value={rate.withPan}
                          onChange={(event) =>
                            patchRate(index, {
                              withPan: event.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="gs-num"
                          inputMode="decimal"
                          aria-label={`Row ${index + 1} rate without PAN`}
                          value={rate.withoutPan}
                          onChange={(event) =>
                            patchRate(index, {
                              withoutPan: event.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="cn-icon"
                          aria-label={`Remove row ${index + 1}`}
                          disabled={rates.length === 1}
                          onClick={() =>
                            setRates((current) =>
                              current.filter(
                                (_, rowIndex) => rowIndex !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="dl-tool cn-add"
              onClick={() =>
                setRates((current) => [
                  ...current,
                  emptyRate(),
                ])
              }
            >
              <Plus size={14} /> Add deductee type
            </button>
          </section>

          <section className="dl-card cn-section">
            <h3>Thresholds</h3>

            <div className="cn-grid">
              <div className="dl-field">
                <label htmlFor="tn-single">
                  Single payment limit (₹)
                </label>
                <input
                  id="tn-single"
                  inputMode="decimal"
                  value={singleLimit}
                  onChange={(event) =>
                    setSingleLimit(event.target.value)
                  }
                  placeholder="No limit"
                />
              </div>

              <div className="dl-field">
                <label htmlFor="tn-annual">
                  Annual limit per party (₹)
                </label>
                <input
                  id="tn-annual"
                  inputMode="decimal"
                  value={annualLimit}
                  onChange={(event) =>
                    setAnnualLimit(event.target.value)
                  }
                  placeholder="No limit"
                />
              </div>
            </div>

            <span className="cn-hint">
              Configure thresholds according to the applicable tax rules.
            </span>
          </section>

          <div className="cn-actions">
            <button
              type="button"
              className="dl-tool"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="so-primary-button"
              disabled={saving || ledgerLoading}
            >
              {saving ? "Saving..." : "Save nature of payment"}
            </button>
          </div>
        </form>
      )}

      <div className="dl-card">
        {loading ? (
          <div className="dl-state">
            <span>Loading...</span>
          </div>
        ) : natures.length === 0 ? (
          <div className="dl-state">
            <strong>No nature of payment yet</strong>
            <span>
              Add each applicable payment section and its rates.
              Confirm the values with your CA before production use.
            </span>
          </div>
        ) : (
          <div className="dl-table-wrapper">
            <table className="dl-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Name</th>
                  <th>Rates (PAN / no PAN)</th>
                  <th className="gs-num">Single limit</th>
                  <th className="gs-num">Annual limit</th>
                  <th>Effective</th>
                  <th>Ledger</th>
                </tr>
              </thead>

              <tbody>
                {natures.map((nature) => (
                  <tr key={nature._id}>
                    <td>
                      <strong>{nature.section}</strong>
                    </td>

                    <td>{nature.name}</td>

                    <td>
                      {(nature.rates || []).map((rate) => (
                        <span
                          key={rate.deducteeType}
                          className="td-rate"
                        >
                          {RATE_TYPES.find(
                            (type) =>
                              type.value === rate.deducteeType,
                          )?.label || rate.deducteeType}
                          : {rate.withPanPercent}% /{" "}
                          {rate.withoutPanPercent}%
                        </span>
                      ))}
                    </td>

                    <td className="gs-num">
                      {nature.singleThresholdPaise
                        ? money(nature.singleThresholdPaise)
                        : "-"}
                    </td>

                    <td className="gs-num">
                      {nature.annualThresholdPaise
                        ? money(nature.annualThresholdPaise)
                        : "-"}
                    </td>

                    <td>
                      {formatDate(nature.effectiveFrom)}
                      {nature.effectiveTo
                        ? ` to ${formatDate(nature.effectiveTo)}`
                        : ""}
                    </td>

                    <td>{ledgerName(nature.tdsLedgerId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
