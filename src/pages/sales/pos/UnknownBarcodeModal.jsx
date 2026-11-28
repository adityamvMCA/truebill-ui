import React, { useState, useEffect, useRef } from "react";
import { X, Search, PlusCircle, Link2, Barcode, Check, Package, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import barcodeApi from "../../../services/modules/barcodeApi";
import productApi from "../../../services/modules/productApi";

const COMMON_UNITS = ["PCS", "BOX", "PACK", "KG", "LTR", "MTR", "NOS"];
const PACKAGING_PRESETS = [
  { name: "Unit", qty: 1 },
  { name: "Pack", qty: 10 },
  { name: "Box", qty: 12 },
  { name: "Carton", qty: 100 },
];
const GST_RATES = [0, 5, 12, 18, 28];

export default function UnknownBarcodeModal({
  barcode,
  quantity = 1,
  onClose,
  onResolved,
  allProducts = [],
}) {
  const [activeTab, setActiveTab] = useState("link"); // 'link' | 'create'

  // Tab 1: Link Existing Product State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [packagingName, setPackagingName] = useState("Unit");
  const [conversionQty, setConversionQty] = useState(1);
  const [isLinking, setIsLinking] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Tab 2: Quick Create Product State
  const [createForm, setCreateForm] = useState({
    name: "",
    unit: "PCS",
    salePrice: "",
    purchasePrice: "",
    gstRate: 0,
    isBox: false,
    packName: "Box",
    unitsPerPack: 12,
  });
  const [isCreating, setIsCreating] = useState(false);
  const createNameInputRef = useRef(null);

  // Filter existing products on search
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    // 1. Search locally in allProducts
    const localMatches = (allProducts || []).filter((p) => {
      const name = (p.name || "").toLowerCase();
      const code = (p.productCode || p.sku || "").toLowerCase();
      const bc = (p.barcode || "").toLowerCase();
      return name.includes(q) || code.includes(q) || bc.includes(q);
    });

    if (localMatches.length > 0) {
      setSearchResults(localMatches.slice(0, 10));
    }

    // 2. Query remote products if query is long enough
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await productApi.getAll({ search: q, limit: 10, status: "ACTIVE" });
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data?.products)
          ? res.data.products
          : [];

        if (active && list.length > 0) {
          // Merge unique by _id
          const seen = new Set(localMatches.map((p) => String(p._id)));
          const combined = [...localMatches];
          for (const item of list) {
            if (!seen.has(String(item._id))) {
              seen.add(String(item._id));
              combined.push(item);
            }
          }
          setSearchResults(combined.slice(0, 15));
        }
      } catch (err) {
        console.warn("Product search failed:", err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, allProducts]);

  // Focus input when tab changes
  useEffect(() => {
    if (activeTab === "create") {
      setTimeout(() => createNameInputRef.current?.focus(), 80);
    }
  }, [activeTab]);

  // Handle Tab 1: Link Barcode to Existing Product
  const handleLinkBarcode = async (e) => {
    e?.preventDefault();
    if (!selectedProduct?._id) {
      toast.error("Please select a product to link");
      return;
    }
    const cQty = Number(conversionQty) || 1;
    if (cQty <= 0) {
      toast.error("Pack units must be greater than 0");
      return;
    }

    try {
      setIsLinking(true);
      await barcodeApi.register({
        productId: selectedProduct._id,
        barcode: barcode.trim(),
        packagingName: packagingName.trim() || "Unit",
        conversionQuantity: cQty,
        source: "MANUFACTURER",
        isPrimary: cQty === 1,
      });

      toast.success(`Barcode linked to ${selectedProduct.name}`);
      const finalAddedQty = quantity * cQty;
      onResolved(selectedProduct, finalAddedQty);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to link barcode";
      toast.error(msg);
    } finally {
      setIsLinking(false);
    }
  };

  // Handle Tab 2: Quick Create New Product with Barcode
  const handleQuickCreate = async (e) => {
    e?.preventDefault();
    const name = createForm.name.trim();
    if (!name || name.length < 2) {
      toast.error("Please enter a valid product name (min 2 characters)");
      return;
    }

    const salePrice = Number(createForm.salePrice);
    if (isNaN(salePrice) || salePrice < 0) {
      toast.error("Please enter a valid sale price");
      return;
    }

    const unitsPerPack = createForm.isBox ? Number(createForm.unitsPerPack) || 1 : 1;
    if (createForm.isBox && unitsPerPack <= 1) {
      toast.error("Pack / Box units must be more than 1");
      return;
    }

    try {
      setIsCreating(true);
      const payload = {
        name,
        type: "GOODS",
        unit: (createForm.unit || "PCS").trim().toUpperCase(),
        salePrice: Number(createForm.salePrice) || 0,
        purchasePrice: Number(createForm.purchasePrice) || 0,
        gstRate: Number(createForm.gstRate) || 0,
        barcode: barcode.trim(),
        barcodePackagingName: createForm.isBox ? createForm.packName.trim() || "Box" : "Unit",
        barcodeUnitsPerPack: unitsPerPack,
        barcodeSource: "MANUFACTURER",
        trackInventory: true,
      };

      const res = await productApi.create(payload);
      const newProduct = res?.data?.data || res?.data;

      if (!newProduct?._id) {
        throw new Error("Product creation failed - missing product ID");
      }

      toast.success(`Created & added "${name}"`);
      const finalAddedQty = quantity * unitsPerPack;
      onResolved(newProduct, finalAddedQty);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.join?.(", ") ||
        err?.message ||
        "Failed to create product";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div
        className="pos-modal-card pos-unknown-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        {/* Header */}
        <div className="pos-modal-header" style={{ borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#fef2f2",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Barcode size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                Unknown Barcode
              </h3>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
                This barcode is not mapped to any product in your inventory
              </div>
            </div>
          </div>
          <button type="button" className="pos-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Barcode Display Badge */}
        <div
          style={{
            margin: "14px 16px 8px",
            padding: "10px 14px",
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Barcode size={18} style={{ color: "#3b82f6" }} />
            <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
              Scanned Code:
            </span>
            <strong
              style={{
                fontFamily: "monospace",
                fontSize: "1rem",
                letterSpacing: "0.5px",
                color: "#0f172a",
              }}
            >
              {barcode}
            </strong>
          </div>
          {quantity > 1 && (
            <span
              style={{
                fontSize: "0.72rem",
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              Qty: {quantity}
            </span>
          )}
        </div>

        {/* Action Tabs: Link to Existing vs Quick Add */}
        <div
          style={{
            display: "flex",
            margin: "8px 16px",
            borderBottom: "2px solid #f1f5f9",
            gap: 8,
          }}
        >
          <button
            type="button"
            className={`pos-unknown-tab-btn ${activeTab === "link" ? "active" : ""}`}
            onClick={() => setActiveTab("link")}
            style={{
              flex: 1,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: "none",
              border: "none",
              borderBottom: activeTab === "link" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "link" ? "#2563eb" : "#64748b",
              fontWeight: 600,
              fontSize: "0.86rem",
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            <Link2 size={16} />
            <span>Map to Existing Product</span>
          </button>

          <button
            type="button"
            className={`pos-unknown-tab-btn ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
            style={{
              flex: 1,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: "none",
              border: "none",
              borderBottom: activeTab === "create" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "create" ? "#2563eb" : "#64748b",
              fontWeight: 600,
              fontSize: "0.86rem",
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            <PlusCircle size={16} />
            <span>Quick Add Product</span>
          </button>
        </div>

        {/* TAB 1: Link Barcode to Existing Product */}
        {activeTab === "link" && (
          <form onSubmit={handleLinkBarcode} style={{ padding: "12px 16px" }}>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                1. Select Existing Product from Inventory:
              </label>

              {selectedProduct ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#166534" }}>
                      {selectedProduct.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#15803d", marginTop: 2 }}>
                      SKU: {selectedProduct.productCode || "-"} • Rate: ₹
                      {selectedProduct.salePrice || 0} • Unit: {selectedProduct.unit || "PCS"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "0 10px",
                      background: "#fff",
                    }}
                  >
                    <Search size={16} style={{ color: "#94a3b8" }} />
                    <input
                      type="text"
                      placeholder="Type product name or SKU to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        padding: "9px 8px",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>

                  {/* Dropdown Results */}
                  {searchQuery.trim().length >= 2 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                        marginTop: 4,
                        maxHeight: 180,
                        overflowY: "auto",
                        zIndex: 20,
                      }}
                    >
                      {isSearching && (
                        <div style={{ padding: "8px 12px", fontSize: "0.78rem", color: "#64748b" }}>
                          Searching products...
                        </div>
                      )}
                      {!isSearching && searchResults.length === 0 && (
                        <div style={{ padding: "10px 12px", fontSize: "0.8rem", color: "#64748b" }}>
                          No matching product found. Switch to "Quick Add Product" tab to create it.
                        </div>
                      )}
                      {searchResults.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setSearchQuery("");
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid #f1f5f9",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                              {p.productCode || p.sku} • {p.unit || "PCS"}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#2563eb" }}>
                            ₹{p.salePrice || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Packaging / Pack Options */}
            <div style={{ marginTop: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                2. Barcode Packaging Type:
              </label>

              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {PACKAGING_PRESETS.map((pre) => (
                  <button
                    key={pre.name}
                    type="button"
                    onClick={() => {
                      setPackagingName(pre.name);
                      setConversionQty(pre.qty);
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      border: "1px solid",
                      borderColor: packagingName === pre.name ? "#2563eb" : "#cbd5e1",
                      background: packagingName === pre.name ? "#eff6ff" : "#fff",
                      color: packagingName === pre.name ? "#1d4ed8" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    {pre.name} ({pre.qty})
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label
                    style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: 3 }}
                  >
                    Packaging Name
                  </label>
                  <input
                    type="text"
                    value={packagingName}
                    onChange={(e) => setPackagingName(e.target.value)}
                    placeholder="e.g. Unit, Box, Pack"
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: 3 }}
                  >
                    Units per Scan
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={conversionQty}
                    onChange={(e) => setConversionQty(Math.max(1, Number(e.target.value) || 1))}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pos-modal-footer" style={{ marginTop: 20, padding: 0 }}>
              <button
                type="button"
                className="pos-btn-icon-subtle"
                onClick={onClose}
                disabled={isLinking}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pos-btn-checkout"
                disabled={!selectedProduct || isLinking}
                style={{ minHeight: 40, padding: "0 18px", gap: 6 }}
              >
                {isLinking ? (
                  <span>Linking...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Link & Add to Cart</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Quick Create New Product with this Barcode */}
        {activeTab === "create" && (
          <form onSubmit={handleQuickCreate} style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: 4,
                  }}
                >
                  Product Name *
                </label>
                <input
                  ref={createNameInputRef}
                  type="text"
                  required
                  placeholder="e.g. Parle-G 100g, Dettol Soap 75g..."
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              {/* Unit Selection with Chips */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: 4,
                  }}
                >
                  Unit
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {COMMON_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setCreateForm((prev) => ({ ...prev, unit: u }))}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        border: "1px solid",
                        borderColor: createForm.unit === u ? "#2563eb" : "#cbd5e1",
                        background: createForm.unit === u ? "#eff6ff" : "#fff",
                        color: createForm.unit === u ? "#1d4ed8" : "#475569",
                        cursor: "pointer",
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price and GST Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: 4,
                    }}
                  >
                    Sale Price (₹) *
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={createForm.salePrice}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, salePrice: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: 4,
                    }}
                  >
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Optional"
                    value={createForm.purchasePrice}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, purchasePrice: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>

              {/* GST Rate */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: 4,
                  }}
                >
                  GST Rate (%)
                </label>
                <select
                  value={createForm.gstRate}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, gstRate: Number(e.target.value) || 0 }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                  }}
                >
                  {GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}% GST
                    </option>
                  ))}
                </select>
              </div>

              {/* Box / Pack Checkbox */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  fontSize: "0.82rem",
                  color: "#334155",
                }}
              >
                <input
                  type="checkbox"
                  id="chk-box-barcode"
                  checked={createForm.isBox}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, isBox: e.target.checked }))
                  }
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="chk-box-barcode" style={{ cursor: "pointer", fontWeight: 500 }}>
                  This barcode is for a Pack / Box (contains multiple units)
                </label>
              </div>

              {createForm.isBox && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    background: "#f8fafc",
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b" }}>
                      Pack Name
                    </label>
                    <input
                      type="text"
                      value={createForm.packName}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, packName: e.target.value }))
                      }
                      placeholder="Box"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: "0.82rem",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b" }}>
                      Units per Pack
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={createForm.unitsPerPack}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          unitsPerPack: Math.max(2, Number(e.target.value) || 2),
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: "0.82rem",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pos-modal-footer" style={{ marginTop: 18, padding: 0 }}>
              <button
                type="button"
                className="pos-btn-icon-subtle"
                onClick={onClose}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pos-btn-checkout"
                disabled={isCreating}
                style={{ minHeight: 40, padding: "0 18px", gap: 6 }}
              >
                {isCreating ? (
                  <span>Creating...</span>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    <span>Create & Add to Cart</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
