import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Search,
  Tags,
  Users,
  Warehouse,
} from "lucide-react";

// Keep the shared bl-* styles loaded (adjust the path if needed),
// unless they are already imported globally.
import "../../accounting/BankLedger.css";
import "./ProductReport.css";
import productReportApi from "../../../services/modules/productReportApi";
import EntitySearchPicker from "../../../components/common/EntitySearchPicker/EntitySearchPicker"; // adjust path
import api from "../../../services/api"; // adjust path

/* ---------- helpers ---------- */

const toLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalDate(date);
};

const PRESETS = [
  { key: "7", label: "Last 7 Days" },
  { key: "30", label: "Last 30 Days" },
  { key: "90", label: "Last 90 Days" },
  { key: "365", label: "Last 365 Days" },
  { key: "custom", label: "Custom" },
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const money = (value) => (Number(value) ? currency.format(Number(value)) : "—");

const qty = (value, unit = "") => {
  const number = Number(value || 0);
  return `${number < 0 ? "- " : ""}${Math.abs(number)} ${unit}`.trim();
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/\//g, "-");
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Unable to load report.";

const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const TABS = [
  { key: "item", label: "Item Details", icon: FileText },
  { key: "stock", label: "Stock Details", icon: FileText },
  { key: "party", label: "Party Wise Report", icon: Users },
  { key: "godown", label: "Godown", icon: Warehouse },
  { key: "prices", label: "Party Wise Prices", icon: Tags },
];

/* Fetcher for the item picker (server-side search + pagination). */
const fetchProductOptions = async ({ search, page, limit }) => {
  const params = { page, limit };
  if (search) params.search = search;

  const response = await api.product.getAll(params);
  const body = response?.data;

  const data = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.products)
      ? body.products
      : Array.isArray(body)
        ? body
        : [];

  const total = Number(body?.pagination?.total);

  return {
    data,
    total: Number.isFinite(total) && total >= 0 ? total : data.length,
  };
};

/* ---------- component ---------- */

export default function ProductReport() {
  const navigate = useNavigate();
  const params = useParams();

  // Works whatever the route param is called: :productCode, :code or :id
  const rawCode = params.productCode ?? params.code ?? params.id ?? "";
  const productCode = String(rawCode).trim();

  // No code in the URL = report page opened directly -> show the item picker
  const hasCode = productCode !== "";
  const codeValid =
    hasCode && !["null", "undefined"].includes(productCode.toLowerCase());

  const [tab, setTab] = useState("stock");
  const [preset, setPreset] = useState("365");
  const [startDate, setStartDate] = useState(() => daysAgo(365));
  const [endDate, setEndDate] = useState(() => toLocalDate(new Date()));
  const [search, setSearch] = useState("");

  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const unit = product?.unit || "";
  const usesDates = tab === "stock" || tab === "party";

  const onPreset = (value) => {
    setPreset(value);

    if (value !== "custom") {
      setStartDate(daysAgo(Number(value)));
      setEndDate(toLocalDate(new Date()));
    }
  };

  /* ----- picker: choose an item ----- */

  const handlePick = (code) => {
    if (!code) {
      navigate("/products/report");
      return;
    }

    setTab("stock");
    setSearch("");
    navigate(`/products/${encodeURIComponent(code)}/report`);
  };

  /* ----- load product once (header, unit, Item Details tab) ----- */

  useEffect(() => {
    if (!codeValid) {
      setProduct(null);
      setRows([]);
      setProductError(hasCode ? "Invalid product code in the page URL." : "");
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      setProductLoading(true);
      setProductError("");

      try {
        const response = await productReportApi.getProduct(productCode);
        const data = response?.data?.data;

        if (!data) throw new Error("Product not found.");
        if (!cancelled) setProduct(data);
      } catch (err) {
        if (!cancelled) {
          setProduct(null);
          setProductError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [productCode, codeValid, hasCode, refreshKey]);

  /* ----- load the selected tab ----- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = { startDate, endDate };
      let response;

      if (tab === "stock") response = await productReportApi.getStock(productCode, query);
      else if (tab === "party") response = await productReportApi.getPartyWise(productCode, query);
      else if (tab === "godown") response = await productReportApi.getGodown(productCode);
      else response = await productReportApi.getPartyPrices(productCode);

      const body = response?.data;

      if (!body?.success || !Array.isArray(body.rows)) {
        throw new Error(body?.message || "Invalid report response.");
      }

      setRows(body.rows);
    } catch (err) {
      setRows([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, productCode, startDate, endDate]);

  useEffect(() => {
    if (tab === "item" || !codeValid) {
      setRows([]);
      setError("");
      return;
    }

    if (usesDates && (!startDate || !endDate || startDate > endDate)) {
      setRows([]);
      setError("Choose a valid From and To date.");
      return;
    }

    void load();
  }, [load, refreshKey, tab, codeValid, usesDates, startDate, endDate]);

  /* ----- derived ----- */

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      Object.values(row)
        .filter((v) => typeof v === "string" || typeof v === "number")
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [rows, search]);

  const busy = tab === "item" ? productLoading : loading;
  const ready = !busy && !error && !productError && codeValid;

  /* ----- export ----- */

  const exportCsv = () => {
    let header = [];
    let body = [];

    if (tab === "stock") {
      header = ["Date", "Transaction Type", "Quantity", "Invoice Number", "Closing Stock"];
      body = visibleRows.map((r) => [
        formatDate(r.date),
        r.transactionType,
        qty(r.quantity, unit),
        r.invoiceNumber || "-",
        qty(r.closingStock, unit),
      ]);
    } else if (tab === "party") {
      header = ["Party Name", "Sales Quantity", "Sales Amount", "Purchase Quantity", "Purchase Amount"];
      body = visibleRows.map((r) => [
        r.partyName,
        r.salesQuantity,
        Number(r.salesAmount).toFixed(2),
        r.purchaseQuantity,
        Number(r.purchaseAmount).toFixed(2),
      ]);
    } else if (tab === "godown") {
      header = ["Godown Name", "Stock Available", "Address"];
      body = visibleRows.map((r) => [r.godownName, qty(r.stockAvailable, unit), r.address]);
    } else if (tab === "prices") {
      header = ["Party Name", "Type", "Last Rate", "Min Rate", "Max Rate", "Last Date"];
      body = visibleRows.map((r) => [
        r.partyName,
        r.partyType,
        r.lastRate,
        r.minRate,
        r.maxRate,
        formatDate(r.lastDate),
      ]);
    } else {
      return;
    }

    const csv = [header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `product-${tab}-${productCode}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ----- table ----- */

  const emptyRow = (cols, text) => (
    <tr>
      <td colSpan={cols} className="bl-empty">
        {text}
      </td>
    </tr>
  );

  const renderTable = () => {
    const columns = { stock: 5, party: 5, godown: 3, prices: 6 }[tab];

    const state = loading
      ? emptyRow(columns, "Loading...")
      : error || productError
        ? emptyRow(columns, "Unable to display report.")
        : !visibleRows.length
          ? emptyRow(columns, "No records found.")
          : null;

    return (
      <section className="bl-table-card" aria-busy={loading}>
        <div className="bl-table-scroll pr-scroll" tabIndex={0}>
          <table className="bl-table pr-table">
            <thead>
              {tab === "stock" && (
                <tr>
                  <th>Date</th>
                  <th>Transaction Type</th>
                  <th>Quantity</th>
                  <th>Invoice Number</th>
                  <th>Closing Stock</th>
                </tr>
              )}
              {tab === "party" && (
                <tr>
                  <th>Party Name</th>
                  <th>Sales Quantity</th>
                  <th>Sales Amount</th>
                  <th>Purchase Quantity</th>
                  <th>Purchase Amount</th>
                </tr>
              )}
              {tab === "godown" && (
                <tr>
                  <th>Godown Name</th>
                  <th>Stock Available</th>
                  <th>Address</th>
                </tr>
              )}
              {tab === "prices" && (
                <tr>
                  <th>Party Name</th>
                  <th>Type</th>
                  <th className="bl-number">Last Rate</th>
                  <th className="bl-number">Min Rate</th>
                  <th className="bl-number">Max Rate</th>
                  <th>Last Date</th>
                </tr>
              )}
            </thead>

            <tbody>
              {state ||
                visibleRows.map((r, index) => {
                  if (tab === "stock") {
                    return (
                      <tr key={r._id || index}>
                        <td className="bl-nowrap">{formatDate(r.date)}</td>
                        <td>{r.transactionType}</td>
                        <td className={r.quantity < 0 ? "bl-out" : r.quantity > 0 ? "bl-in" : ""}>
                          {qty(r.quantity, unit)}
                        </td>
                        <td>{r.invoiceNumber || "-"}</td>
                        <td>{qty(r.closingStock, unit)}</td>
                      </tr>
                    );
                  }

                  if (tab === "party") {
                    return (
                      <tr key={r.partyId || r.partyName}>
                        <td><strong className="bl-doc">{r.partyName}</strong></td>
                        <td>{r.salesQuantity}</td>
                        <td>{money(r.salesAmount)}</td>
                        <td>{r.purchaseQuantity}</td>
                        <td>{money(r.purchaseAmount)}</td>
                      </tr>
                    );
                  }

                  if (tab === "godown") {
                    return (
                      <tr key={r._id || index}>
                        <td><strong className="bl-doc">{r.godownName}</strong></td>
                        <td className={r.stockAvailable < 0 ? "bl-out" : ""}>
                          {qty(r.stockAvailable, unit)}
                        </td>
                        <td>{r.address || "—"}</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`${r.partyType}-${r.partyId || r.partyName}`}>
                      <td><strong className="bl-doc">{r.partyName}</strong></td>
                      <td>
                        <span className="bl-voucher">
                          {r.partyType === "CUSTOMER" ? "Sale" : "Purchase"}
                        </span>
                      </td>
                      <td className="bl-number">{money(r.lastRate)}</td>
                      <td className="bl-number">{money(r.minRate)}</td>
                      <td className="bl-number">{money(r.maxRate)}</td>
                      <td className="bl-nowrap">{formatDate(r.lastDate)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderItem = () => {
    if (productLoading) return <div className="bl-empty pr-empty">Loading...</div>;
    if (!product) return null;

    const fields = [
      ["Item Code", product.productCode],
      ["Item Name", product.name],
      ["Type", product.type],
      ["Category", product.category],
      ["Brand", product.brand],
      ["Unit", product.unit],
      ["HSN / SAC", product.hsnSacCode],
      ["GST Rate", product.gstRate !== undefined ? `${product.gstRate}%` : ""],
      ["Sale Price", money(product.salePrice)],
      ["Purchase Price", money(product.purchasePrice)],
      ["Current Stock", qty(product.currentStock, product.unit)],
      ["Reorder Level", qty(product.reorderLevel, product.unit)],
      ["Status", product.status],
    ];

    return (
      <section className="bl-cards pr-details">
        {fields.map(([label, value]) => (
          <article className="bl-card" key={label}>
            <span>{label}</span>
            <strong>{value || "—"}</strong>
          </article>
        ))}
      </section>
    );
  };

  /* ----- render ----- */

  const reportTab = tab !== "item";

  return (
    <main className="bl-page pr-page">
      <header className="bl-header">
        <div className="bl-heading">
          <button type="button" className="bl-back" aria-label="Go back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>

          <div className="bl-title">
            <h1>{product?.name || "Item Report"}</h1>
            <p>
              {codeValid
                ? `${productCode} · Item Report`
                : "Select an item to view its report"}
            </p>
          </div>
        </div>

        <div className="bl-actions">
          <button type="button" className="bl-button" onClick={exportCsv} disabled={!ready || !reportTab}>
            <Download size={16} />
            Download
          </button>

          <button type="button" className="bl-button" onClick={() => window.print()} disabled={!ready || !reportTab}>
            <Printer size={16} />
            Print PDF
          </button>

          <button
            type="button"
            className="bl-button bl-button-primary"
            disabled={busy || !codeValid}
            onClick={() => setRefreshKey((n) => n + 1)}
          >
            <RefreshCw size={16} className={busy ? "bl-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Item picker: always available, so the item can be changed any time */}
      <section className="pr-picker">
        <EntitySearchPicker
          label="Item"
          placeholder="Search item by code or name..."
          multiple={false}
          fetchOptions={fetchProductOptions}
          getOptionId={(p) => p.productCode}
          getOptionLabel={(p) => p.name}
          getOptionSubtitle={(p) => `${p.productCode}${p.unit ? ` · ${p.unit}` : ""}`}
          selectedIds={codeValid ? [productCode] : []}
          selectedLabel={
            codeValid
              ? product?.name
                ? `${product.name} (${productCode})`
                : productCode
              : ""
          }
          onToggle={handlePick}
        />
      </section>

      {codeValid && (
        <nav className="pr-tabs" role="tablist" aria-label="Item report sections">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`pr-tab ${tab === key ? "pr-tab-active" : ""}`}
              onClick={() => {
                setTab(key);
                setSearch("");
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      )}

      {(productError || error) && (
        <div className="bl-error" role="alert">
          {productError || error}
        </div>
      )}

      {reportTab && codeValid && (
        <section className="bl-filters pr-filters">
          <div className="bl-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={search}
              placeholder="Search..."
              aria-label="Search report"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {usesDates && (
            <>
              <label className="bl-date">
                <span>Period</span>
                <select value={preset} onChange={(e) => onPreset(e.target.value)}>
                  {PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="bl-date">
                <span>From</span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => {
                    setPreset("custom");
                    setStartDate(e.target.value);
                  }}
                />
              </label>

              <label className="bl-date">
                <span>To</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setPreset("custom");
                    setEndDate(e.target.value);
                  }}
                />
              </label>
            </>
          )}
        </section>
      )}

      {!hasCode ? (
        <div className="bl-empty pr-empty">
          Search and select an item above to see its report.
        </div>
      ) : !codeValid ? null : reportTab ? (
        renderTable()
      ) : (
        renderItem()
      )}

      {ready && reportTab && (
        <footer className="bl-footer">
          <span>
            <Building2 size={12} style={{ verticalAlign: "-2px" }} /> {visibleRows.length} record(s)
            {usesDates && ` · ${startDate} to ${endDate}`}
          </span>
        </footer>
      )}
    </main>
  );
}