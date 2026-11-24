import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  Search,
  Barcode,
  Camera,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Save,
  PauseCircle,
  PlayCircle,
  User,
  UserPlus,
  X,
  CheckCircle2,
  RotateCcw,
  LayoutGrid,
  List,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  IndianRupee,
  Calendar,
  Clock,
  ArrowRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

import productApi from "../../../services/modules/productApi";
import customerApi from "../../../services/modules/customer.api";
import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";
import barcodeApi from "../../../services/modules/barcodeApi";
import productCategoryApi from "../../../services/modules/productCategoryApi";
import routes from "../../../config/routes";
import ScanBarcodeModal from "../../barcode/ScanBarcodeModal";
import "./PosBilling.css";

/* --------------------------------------------------------------------------
   Audio Synthesizer for POS Beep (Zero external asset dependencies)
   -------------------------------------------------------------------------- */
const playBeep = (freq = 880, duration = 0.08, type = "sine") => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Non-critical audio feedback fallback
  }
};

const playSuccessBeep = () => {
  playBeep(920, 0.07);
};

const playErrorBeep = () => {
  playBeep(320, 0.14, "triangle");
};

/* --------------------------------------------------------------------------
   Format Helpers
   -------------------------------------------------------------------------- */
const fmtCurrency = (val) => {
  const num = Number(val) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getTodayDate = () => {
  return new Date().toISOString().slice(0, 10);
};

export default function PosBilling() {
  const navigate = useNavigate();

  // Storage and User Context
  const tenant = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenant") || "{}");
    } catch {
      return {};
    }
  }, []);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // State: Products & Categories
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // State: Barcode & Product Search
  const [scanQuery, setScanQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const scannerInputRef = useRef(null);

  // State: Cart Items
  // [{ product, productId, name, productCode, unitRate, quantity, discountPercent, gstRate, lineTotal }]
  const [cartItems, setCartItems] = useState([]);

  // State: Customer
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    customerName: "",
    phone: "",
    customerType: "Individual",
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // State: Payment & Tender
  const [paymentMode, setPaymentMode] = useState("CASH"); // 'CASH' | 'UPI' | 'CARD' | 'CREDIT'
  const [cashTendered, setCashTendered] = useState("");
  const [additionalDiscount, setAdditionalDiscount] = useState(0);

  // State: Held Bills
  const [heldBills, setHeldBills] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tb_pos_held_bills") || "[]");
    } catch {
      return [];
    }
  });
  const [showHeldModal, setShowHeldModal] = useState(false);

  // State: Completed Sale / Thermal Print Modal
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billNumber, setBillNumber] = useState(() => "POS-" + Math.floor(1000 + Math.random() * 9000));

  /* ------------------------------------------------------------------------
     1. Data Loading: Products, Categories, Customers
     ------------------------------------------------------------------------ */
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingProducts(true);

      const [prodRes, custRes, catRes] = await Promise.allSettled([
        productApi.getAll({ limit: 250, status: "ACTIVE" }),
        customerApi.getAll({ limit: 100 }),
        productCategoryApi.getAll(),
      ]);

      // Handle products
      if (prodRes.status === "fulfilled" && prodRes.value?.data) {
        const prodData = prodRes.value.data;
        const list = Array.isArray(prodData)
          ? prodData
          : Array.isArray(prodData.data)
          ? prodData.data
          : Array.isArray(prodData.products)
          ? prodData.products
          : [];
        setProducts(list);
      }

      // Handle customers
      let custList = [];
      if (custRes.status === "fulfilled" && custRes.value?.data) {
        const custData = custRes.value.data;
        custList = Array.isArray(custData)
          ? custData
          : Array.isArray(custData.data)
          ? custData.data
          : Array.isArray(custData.customers)
          ? custData.customers
          : [];
        setCustomers(custList);
      }

      // Automatically select walk-in or create virtual walk-in
      const walkIn = custList.find(
        (c) =>
          c.customerName?.toLowerCase().includes("cash") ||
          c.customerName?.toLowerCase().includes("walk")
      );
      if (walkIn) {
        setSelectedCustomer(walkIn);
      } else if (custList.length > 0) {
        setSelectedCustomer(custList[0]);
      } else {
        // Default virtual customer
        setSelectedCustomer({
          _id: "walkin_cash_sale",
          customerName: "Walk-in Customer (Cash Sale)",
          phone: "9999999999",
          customerType: "Individual",
        });
      }

      // Handle categories
      if (catRes.status === "fulfilled" && catRes.value?.data) {
        const catData = catRes.value.data;
        const list = Array.isArray(catData)
          ? catData
          : Array.isArray(catData.data)
          ? catData.data
          : [];
        setCategories(list);
      }
    } catch (err) {
      console.error("Failed to load POS data:", err);
      toast.error("Failed to load products or customers");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Save held bills to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tb_pos_held_bills", JSON.stringify(heldBills));
    } catch (e) {
      console.error(e);
    }
  }, [heldBills]);

  // Keep scanner focused on initial mount
  useEffect(() => {
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, []);

  /* ------------------------------------------------------------------------
     2. Keyboard Shortcuts Handler (F1, F4, F8, F12, etc.)
     ------------------------------------------------------------------------ */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F1: Focus Barcode Scanner
      if (e.key === "F1") {
        e.preventDefault();
        scannerInputRef.current?.focus();
        scannerInputRef.current?.select();
      }
      // F4: Hold Bill
      else if (e.key === "F4") {
        e.preventDefault();
        handleHoldBill();
      }
      // F8: View Held Bills
      else if (e.key === "F8") {
        e.preventDefault();
        setShowHeldModal(true);
      }
      // F12 or Ctrl + Enter: Checkout / Save & Print
      else if (e.key === "F12" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        handleSaveAndPrint();
      }
      // Escape: Close modals
      else if (e.key === "Escape") {
        setShowPrintModal(false);
        setShowHeldModal(false);
        setShowAddCustomerModal(false);
        setIsCustomerDropdownOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  /* ------------------------------------------------------------------------
     3. Add Product to Cart Logic
     ------------------------------------------------------------------------ */
  const addToCart = useCallback(
    (product) => {
      if (!product) return;

      const pId = String(product._id || product.id);

      setCartItems((prevItems) => {
        const existingIndex = prevItems.findIndex((item) => item.productId === pId);

        if (existingIndex > -1) {
          // Increment quantity
          const updated = [...prevItems];
          const curr = updated[existingIndex];
          const newQty = curr.quantity + 1;
          const discountedRate = curr.unitRate * (1 - curr.discountPercent / 100);
          const taxable = discountedRate * newQty;
          const tax = taxable * (curr.gstRate / 100);
          const lineTotal = taxable + tax;

          updated[existingIndex] = {
            ...curr,
            quantity: newQty,
            lineTotal,
          };
          playSuccessBeep();
          return updated;
        } else {
          // Add fresh item
          const unitRate = Number(product.salePrice) || Number(product.price) || 0;
          const gstRate = Number(product.gstRate) || 0;
          const discountPercent = 0;
          const taxable = unitRate * 1;
          const tax = taxable * (gstRate / 100);
          const lineTotal = taxable + tax;

          playSuccessBeep();
          return [
            ...prevItems,
            {
              product,
              productId: pId,
              name: product.name,
              productCode: product.productCode || product.sku || "",
              unitRate,
              quantity: 1,
              discountPercent,
              gstRate,
              lineTotal,
            },
          ];
        }
      });
    },
    []
  );

  /* ------------------------------------------------------------------------
     4. Barcode / Fast Input Scanner Handler
     ------------------------------------------------------------------------ */
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    const query = scanQuery.trim();
    if (!query) return;

    // 1. Check loaded products by productCode, barcode, or exact name
    const match = products.find(
      (p) =>
        (p.productCode && p.productCode.toUpperCase() === query.toUpperCase()) ||
        (p.barcode && p.barcode.toUpperCase() === query.toUpperCase()) ||
        (p.name && p.name.toLowerCase() === query.toLowerCase())
    );

    if (match) {
      addToCart(match);
      setScanQuery("");
      return;
    }

    // 2. Lookup barcode remotely if not locally found
    try {
      const res = await barcodeApi.lookup(query);
      if (res?.data?.product) {
        addToCart(res.data.product);
        setScanQuery("");
        return;
      }
    } catch {
      // not in barcode catalog
    }

    // 3. Fallback: partial match on loaded products
    const partialMatch = products.find(
      (p) =>
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.productCode?.toLowerCase().includes(query.toLowerCase())
    );

    if (partialMatch) {
      addToCart(partialMatch);
      setScanQuery("");
    } else {
      playErrorBeep();
      toast.error(`Product "${query}" not found`);
    }
  };

  /* ------------------------------------------------------------------------
     5. Cart Item Modifications (Qty, Rate, Discount, Delete)
     ------------------------------------------------------------------------ */
  const updateItemQty = (index, newQty) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const discountedRate = item.unitRate * (1 - item.discountPercent / 100);
      const taxable = discountedRate * newQty;
      const tax = taxable * (item.gstRate / 100);
      const lineTotal = taxable + tax;

      updated[index] = { ...item, quantity: newQty, lineTotal };
      return updated;
    });
  };

  const updateItemRate = (index, newRate) => {
    const rate = Math.max(0, Number(newRate) || 0);
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const discountedRate = rate * (1 - item.discountPercent / 100);
      const taxable = discountedRate * item.quantity;
      const tax = taxable * (item.gstRate / 100);
      const lineTotal = taxable + tax;

      updated[index] = { ...item, unitRate: rate, lineTotal };
      return updated;
    });
  };

  const updateItemDiscount = (index, newDisc) => {
    const disc = Math.min(100, Math.max(0, Number(newDisc) || 0));
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const discountedRate = item.unitRate * (1 - disc / 100);
      const taxable = discountedRate * item.quantity;
      const tax = taxable * (item.gstRate / 100);
      const lineTotal = taxable + tax;

      updated[index] = { ...item, discountPercent: disc, lineTotal };
      return updated;
    });
  };

  const removeItem = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCartItems([]);
    setCashTendered("");
    setAdditionalDiscount(0);
  };

  /* ------------------------------------------------------------------------
     6. Totals Calculations
     ------------------------------------------------------------------------ */
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalQty = 0;

    cartItems.forEach((item) => {
      const itemQty = item.quantity;
      const discountedRate = item.unitRate * (1 - item.discountPercent / 100);
      const taxable = discountedRate * itemQty;
      const tax = taxable * (item.gstRate / 100);

      subtotal += taxable;
      totalTax += tax;
      totalQty += itemQty;
    });

    const netBeforeDiscount = subtotal + totalTax;
    const finalTotal = Math.max(0, netBeforeDiscount - Number(additionalDiscount || 0));
    const roundedGrandTotal = Math.round(finalTotal);
    const roundOff = (roundedGrandTotal - finalTotal);

    return {
      totalQty,
      subtotal,
      totalTax,
      netBeforeDiscount,
      roundOff,
      grandTotal: roundedGrandTotal,
    };
  }, [cartItems, additionalDiscount]);

  // Cash Return Calculation
  const changeToReturn = useMemo(() => {
    if (paymentMode !== "CASH" || !cashTendered) return 0;
    const tendered = Number(cashTendered) || 0;
    return Math.max(0, tendered - totals.grandTotal);
  }, [paymentMode, cashTendered, totals.grandTotal]);

  /* ------------------------------------------------------------------------
     7. Filtered Products for Catalog Panel
     ------------------------------------------------------------------------ */
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "ALL" && p.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesCode = p.productCode?.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesSku;
      }
      return true;
    });
  }, [products, selectedCategory, searchTerm]);

  // Dynamic distinct categories
  const categoryChips = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  /* ------------------------------------------------------------------------
     8. Customer Actions (Search & Quick Add)
     ------------------------------------------------------------------------ */
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 20);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.customerName?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.customerCode?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerData.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      setCreatingCustomer(true);
      const res = await customerApi.create({
        customerName: newCustomerData.customerName.trim(),
        phone: newCustomerData.phone.trim() || undefined,
        customerType: newCustomerData.customerType,
      });

      const created = res?.data?.data || res?.data;
      if (created) {
        toast.success(`Customer ${created.customerName} added`);
        setCustomers((prev) => [created, ...prev]);
        setSelectedCustomer(created);
        setShowAddCustomerModal(false);
        setNewCustomerData({ customerName: "", phone: "", customerType: "Individual" });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  /* ------------------------------------------------------------------------
     9. Hold & Recall Bills Logic
     ------------------------------------------------------------------------ */
  const handleHoldBill = () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty. Add items before holding.");
      return;
    }

    const heldItem = {
      id: "HOLD-" + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: getTodayDate(),
      customer: selectedCustomer,
      items: cartItems,
      grandTotal: totals.grandTotal,
      itemCount: cartItems.length,
      paymentMode,
    };

    setHeldBills((prev) => [heldItem, ...prev]);
    clearCart();
    toast.success(`Bill held for ${selectedCustomer?.customerName || "Customer"}`);
  };

  const handleRecallBill = (heldItem) => {
    setCartItems(heldItem.items);
    if (heldItem.customer) setSelectedCustomer(heldItem.customer);
    if (heldItem.paymentMode) setPaymentMode(heldItem.paymentMode);

    // Remove from held list
    setHeldBills((prev) => prev.filter((b) => b.id !== heldItem.id));
    setShowHeldModal(false);
    toast.success("Bill restored to cart");
  };

  const handleDeleteHeldBill = (heldId) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== heldId));
    toast.success("Held bill removed");
  };

  /* ------------------------------------------------------------------------
     10. Checkout / Save & Post Sales Invoice
     ------------------------------------------------------------------------ */
  const handleSaveAndPrint = async (shouldPrint = true) => {
    if (cartItems.length === 0) {
      toast.error("Please add items to cart before saving");
      scannerInputRef.current?.focus();
      return;
    }

    // Resolve Customer ID
    let targetCustomerId = selectedCustomer?._id;
    if (!targetCustomerId || targetCustomerId === "walkin_cash_sale") {
      // Find or create real walk-in customer in database
      const realCustomer = customers.find(
        (c) =>
          c.customerName?.toLowerCase().includes("cash") ||
          c.customerName?.toLowerCase().includes("walk")
      );
      if (realCustomer?._id) {
        targetCustomerId = realCustomer._id;
      } else if (customers[0]?._id) {
        targetCustomerId = customers[0]._id;
      } else {
        toast.error("Please select or add a customer first");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const invoicePayload = {
        customerId: targetCustomerId,
        invoiceDate: getTodayDate(),
        dueDate: getTodayDate(),
        paymentTerms: "Due on Receipt",
        taxMode: "INTRA_STATE",
        updateStock: true,
        action: "SAVE_AND_POST",
        notes: `POS Counter Sale | Payment: ${paymentMode} | Bill: ${billNumber}`,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          discountPercent: Number(item.discountPercent || 0),
          gstRate: Number(item.gstRate || 0),
        })),
      };

      const response = await salesInvoiceApi.create(invoicePayload);
      const saved = response?.data?.data || response?.data;

      playSuccessBeep();
      toast.success("Invoice created successfully!");

      const invoiceObj = {
        invoiceNumber: saved?.invoiceNumber || billNumber,
        invoiceDate: getTodayDate(),
        customerName: selectedCustomer?.customerName || "Walk-in Customer",
        customerPhone: selectedCustomer?.phone || "",
        customerGstNo: selectedCustomer?.gstNo || "",
        items: cartItems,
        totals,
        paymentMode,
        cashTendered: cashTendered ? Number(cashTendered) : totals.grandTotal,
        changeToReturn,
        companyName: tenant?.companyName || tenant?.name || "TRUEBILL STORE",
        companyAddress: tenant?.address || tenant?.city || "Retail Counter",
        companyPhone: tenant?.phone || "",
        companyGstin: tenant?.gstin || "",
        upiId: tenant?.upiId || "merchant@upi",
      };

      setSavedInvoice(invoiceObj);

      if (shouldPrint) {
        setShowPrintModal(true);
      } else {
        startNewSale();
      }
    } catch (err) {
      console.error("Save invoice error:", err);
      playErrorBeep();
      const msg = err.response?.data?.message || err.message || "Failed to create POS invoice";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startNewSale = () => {
    clearCart();
    setBillNumber("POS-" + Math.floor(1000 + Math.random() * 9000));
    setShowPrintModal(false);
    setSavedInvoice(null);
    scannerInputRef.current?.focus();
  };

  const triggerThermalPrint = () => {
    window.print();
  };

  return (
    <div className="pos-container">
      {/* ====================================================================
          1. Header Navigation Bar
          ==================================================================== */}
      <header className="pos-header-bar">
        <div className="pos-header-left">
          <div className="pos-title-badge">
            <ShoppingCart className="text-primary" size={20} />
            <span>POS Billing</span>
            <span className="pos-live-pill">
              <span className="pos-live-dot" /> Live Counter
            </span>
          </div>

          <div className="pos-bill-meta">
            <span className="pos-meta-item">
              <Calendar size={14} />
              <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </span>
            <span className="pos-meta-item">
              <Clock size={14} />
              <span>Bill: <strong>{billNumber}</strong></span>
            </span>
          </div>
        </div>

        <div className="pos-header-right">
          {heldBills.length > 0 && (
            <button
              type="button"
              className="pos-btn-held"
              onClick={() => setShowHeldModal(true)}
              title="View Parked / Held Bills (F8)"
            >
              <PauseCircle size={15} />
              <span>Held Bills ({heldBills.length})</span>
              <kbd className="pos-shortcut-hint">F8</kbd>
            </button>
          )}

          <button
            type="button"
            className="pos-btn-icon-subtle"
            onClick={startNewSale}
            title="Start Fresh Bill"
          >
            <RotateCcw size={14} />
            <span>New Sale</span>
          </button>

          <button
            type="button"
            className="pos-btn-icon-subtle"
            onClick={() => navigate(routes.sales?.invoices || "/sales/invoices")}
            title="View All Sales Invoices"
          >
            <span>Invoices List</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ====================================================================
          2. Main Split View: Left Catalog & Right Cart
          ==================================================================== */}
      <div className="pos-body-split">
        {/* ------------------------------------------------------------------
            LEFT PANEL: Scanner, Categories & Product Cards
            ------------------------------------------------------------------ */}
        <section className="pos-catalog-panel">
          {/* Scanner Box & Camera Scanner */}
          <div className="pos-search-section">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <form onSubmit={handleScannerSubmit} className="pos-scanner-box" style={{ flex: 1 }}>
                <Barcode className="pos-scanner-icon" size={22} />
                <input
                  ref={scannerInputRef}
                  type="text"
                  className="pos-scanner-input"
                  placeholder="Scan barcode or type SKU / Item code & press Enter..."
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                />
                <span className="pos-scanner-kbd">F1</span>
              </form>

              <button
                type="button"
                className="pos-btn-icon-subtle"
                style={{
                  height: 42,
                  padding: "0 12px",
                  gap: 6,
                  background: "#eff6ff",
                  color: "var(--primary-color, #2563eb)",
                  borderColor: "#bfdbfe",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
                onClick={() => setCameraModalOpen(true)}
                title="Scan with Camera"
              >
                <Camera size={16} />
                <span>Camera Scan</span>
              </button>
            </div>

            <div className="pos-search-controls">
              {/* Category Filter Chips */}
              <div className="pos-category-scroll">
                {categoryChips.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`pos-cat-chip ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === "ALL" ? "All Items" : cat}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="pos-view-toggles">
                <button
                  type="button"
                  className={`pos-view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  className={`pos-view-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Product Viewport */}
          <div className="pos-products-viewport">
            {loadingProducts ? (
              <div className="pos-empty-cart">
                <Sparkles className="animate-spin text-primary" size={28} />
                <p className="pos-empty-cart-text" style={{ marginTop: 8 }}>Loading catalog...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="pos-empty-cart">
                <ShoppingCart className="pos-empty-cart-icon" size={32} />
                <p className="pos-empty-cart-text">No products found</p>
                <p className="pos-empty-cart-sub">Try changing the category or search keyword</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="pos-products-grid">
                {filteredProducts.map((p) => {
                  const pId = String(p._id || p.id);
                  const inCartItem = cartItems.find((it) => it.productId === pId);
                  const inStock = (p.currentStock ?? 0) > 0 || p.trackInventory === false;

                  return (
                    <div
                      key={pId}
                      className={`pos-product-card ${inCartItem ? "in-cart" : ""}`}
                      onClick={() => addToCart(p)}
                    >
                      {inCartItem && (
                        <span className="pos-prod-badge-cart">{inCartItem.quantity} in cart</span>
                      )}

                      <div className="pos-prod-header">
                        <span className="pos-prod-sku">{p.productCode || p.sku || "PROD"}</span>
                        <div className="pos-prod-name" title={p.name}>
                          {p.name}
                        </div>
                      </div>

                      <div className="pos-prod-footer">
                        <div>
                          <div className="pos-prod-price">{fmtCurrency(p.salePrice || p.price)}</div>
                          <span className="pos-prod-tax">GST {p.gstRate || 0}%</span>
                        </div>

                        <span className={`pos-prod-stock ${inStock ? "in" : "out"}`}>
                          {p.trackInventory === false
                            ? "Service"
                            : inStock
                            ? `${p.currentStock} in stock`
                            : "Out of Stock"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="pos-products-table">
                <thead>
                  <tr>
                    <th>Item & SKU</th>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Price</th>
                    <th style={{ textAlign: "center" }}>Stock</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const pId = String(p._id || p.id);
                    const inStock = (p.currentStock ?? 0) > 0 || p.trackInventory === false;

                    return (
                      <tr key={pId} onClick={() => addToCart(p)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{p.productCode}</div>
                        </td>
                        <td>{p.category || "-"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmtCurrency(p.salePrice || p.price)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`pos-prod-stock ${inStock ? "in" : "out"}`}>
                            {p.trackInventory === false ? "Service" : p.currentStock ?? 0}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="pos-btn-icon-subtle"
                            style={{ padding: "3px 8px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                          >
                            <Plus size={13} /> Add
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------------
            RIGHT PANEL: Cart & Fast Checkout
            ------------------------------------------------------------------ */}
        <section className="pos-cart-panel">
          {/* Customer Bar */}
          <div className="pos-customer-bar">
            <div className="pos-cust-picker-wrapper">
              <div
                className="pos-cust-current"
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
              >
                <div className="pos-cust-left">
                  <div className="pos-cust-avatar">
                    <User size={15} />
                  </div>
                  <div className="pos-cust-details">
                    <span className="pos-cust-name">
                      {selectedCustomer?.customerName || "Select Customer"}
                    </span>
                    <span className="pos-cust-phone">
                      {selectedCustomer?.phone || "Cash Sale / Walk-in"}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Change ▼</span>
              </div>

              {/* Customer Dropdown */}
              {isCustomerDropdownOpen && (
                <div className="pos-cust-dropdown-menu">
                  <div className="pos-cust-dropdown-search">
                    <input
                      type="text"
                      placeholder="Search name or mobile..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="pos-cust-list-scroll">
                    {/* Walk-in shortcut */}
                    <div
                      className="pos-cust-option"
                      onClick={() => {
                        setSelectedCustomer({
                          _id: "walkin_cash_sale",
                          customerName: "Walk-in Customer (Cash Sale)",
                          phone: "9999999999",
                          customerType: "Individual",
                        });
                        setIsCustomerDropdownOpen(false);
                      }}
                    >
                      <div>
                        <strong>Walk-in Customer</strong>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Instant Cash Sale</div>
                      </div>
                      <span className="pos-live-pill">Default</span>
                    </div>

                    {filteredCustomers.map((c) => (
                      <div
                        key={c._id || c.customerCode}
                        className={`pos-cust-option ${selectedCustomer?._id === c._id ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsCustomerDropdownOpen(false);
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.customerName}</div>
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{c.phone || c.email || "-"}</div>
                        </div>
                        {c.gstNo && <span style={{ fontSize: "0.68rem", color: "#16a34a" }}>GSTIN</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="pos-btn-add-cust"
              onClick={() => setShowAddCustomerModal(true)}
              title="Add New Customer"
            >
              <UserPlus size={14} />
              <span>+ Customer</span>
            </button>
          </div>

          {/* Cart Items Table */}
          <div className="pos-cart-items-viewport">
            {cartItems.length === 0 ? (
              <div className="pos-empty-cart">
                <ShoppingCart className="pos-empty-cart-icon" size={40} />
                <p className="pos-empty-cart-text">Cart is Empty</p>
                <p className="pos-empty-cart-sub">
                  Scan a barcode or click any product on the left to start billing
                </p>
              </div>
            ) : (
              <table className="pos-cart-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Item</th>
                    <th style={{ width: "24%", textAlign: "center" }}>Qty</th>
                    <th style={{ width: "16%", textAlign: "right" }}>Rate (₹)</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Total (₹)</th>
                    <th style={{ width: "7%", textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item, idx) => (
                    <tr key={item.productId}>
                      <td>
                        <div className="pos-cart-item-title">{item.name}</div>
                        <div className="pos-cart-item-sku">
                          {item.productCode} • {item.gstRate}% GST
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div className="pos-qty-counter">
                          <button
                            type="button"
                            className="pos-qty-btn"
                            onClick={() => updateItemQty(idx, item.quantity - 1)}
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            className="pos-qty-input"
                            value={item.quantity}
                            onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                          />
                          <button
                            type="button"
                            className="pos-qty-btn"
                            onClick={() => updateItemQty(idx, item.quantity + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <input
                          type="number"
                          step="0.01"
                          className="pos-rate-input"
                          value={item.unitRate}
                          onChange={(e) => updateItemRate(idx, e.target.value)}
                        />
                      </td>

                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {fmtCurrency(item.lineTotal)}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="pos-btn-del-item"
                          onClick={() => removeItem(idx)}
                          title="Remove Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Checkout & Tender Section */}
          <div className="pos-checkout-section">
            {/* Totals Summary Breakdown */}
            <div className="pos-summary-table">
              <div className="pos-summary-row">
                <span>Items: {cartItems.length} (Qty: {totals.totalQty})</span>
                <span>Taxable: {fmtCurrency(totals.subtotal)}</span>
              </div>
              <div className="pos-summary-row">
                <span>Total GST</span>
                <span>+{fmtCurrency(totals.totalTax)}</span>
              </div>
              {totals.roundOff !== 0 && (
                <div className="pos-summary-row" style={{ fontSize: "0.75rem" }}>
                  <span>Round-off</span>
                  <span>{totals.roundOff > 0 ? "+" : ""}{totals.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="pos-summary-row grand-total">
                <span>Grand Total</span>
                <span className="pos-grand-amount">{fmtCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="pos-payment-mode-tabs">
              <button
                type="button"
                className={`pos-pay-tab ${paymentMode === "CASH" ? "active" : ""}`}
                onClick={() => setPaymentMode("CASH")}
              >
                <Banknote size={15} /> Cash
              </button>
              <button
                type="button"
                className={`pos-pay-tab ${paymentMode === "UPI" ? "active" : ""}`}
                onClick={() => setPaymentMode("UPI")}
              >
                <QrCode size={15} /> UPI / QR
              </button>
              <button
                type="button"
                className={`pos-pay-tab ${paymentMode === "CARD" ? "active" : ""}`}
                onClick={() => setPaymentMode("CARD")}
              >
                <CreditCard size={15} /> Card
              </button>
              <button
                type="button"
                className={`pos-pay-tab ${paymentMode === "CREDIT" ? "active" : ""}`}
                onClick={() => setPaymentMode("CREDIT")}
              >
                <User size={15} /> Credit (Udhaar)
              </button>
            </div>

            {/* Cash Fast Tender Pills & Change Calculator */}
            {paymentMode === "CASH" && (
              <div className="pos-cash-tender-box">
                <div className="pos-fast-cash-pills">
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Tender:</span>
                  <button
                    type="button"
                    className="pos-cash-pill"
                    onClick={() => setCashTendered(String(totals.grandTotal))}
                  >
                    Exact ({fmtCurrency(totals.grandTotal)})
                  </button>
                  {[100, 200, 500, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="pos-cash-pill"
                      onClick={() => setCashTendered(String(amt))}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="pos-tender-row">
                  <div className="pos-tender-input-wrap">
                    <span>Cash Received: ₹</span>
                    <input
                      type="number"
                      className="pos-tender-input"
                      placeholder="0.00"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                    />
                  </div>

                  {changeToReturn > 0 && (
                    <div className="pos-change-display">
                      <span>Change: <strong>{fmtCurrency(changeToReturn)}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pos-action-buttons">
              <button
                type="button"
                className="pos-btn-park"
                onClick={handleHoldBill}
                disabled={cartItems.length === 0}
                title="Hold / Park Bill (F4)"
              >
                <PauseCircle size={15} /> Hold (F4)
              </button>

              <button
                type="button"
                className="pos-btn-save"
                onClick={() => handleSaveAndPrint(false)}
                disabled={cartItems.length === 0 || isSubmitting}
                title="Save Bill without opening print preview"
              >
                <Save size={15} /> Save
              </button>

              <button
                type="button"
                className="pos-btn-checkout"
                onClick={() => handleSaveAndPrint(true)}
                disabled={cartItems.length === 0 || isSubmitting}
                title="Save Invoice & Print Thermal Bill (F12 / Ctrl+Enter)"
              >
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Printer size={18} />
                    <span>Save & Print (F12)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================================
          3. Modal: Thermal Receipt Print Preview (80mm / 58mm)
          ==================================================================== */}
      {showPrintModal && savedInvoice && (
        <div className="pos-modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="pos-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h3>
                <Printer size={18} className="text-primary" />
                <span>Thermal Bill Preview (80mm)</span>
              </h3>
              <button
                type="button"
                className="pos-modal-close"
                onClick={() => setShowPrintModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-receipt-scroll">
              <div className="pos-thermal-paper">
                <div className="pos-thermal-center">
                  <div className="pos-th-name">{savedInvoice.companyName}</div>
                  <div style={{ fontSize: "11px", color: "#333" }}>{savedInvoice.companyAddress}</div>
                  {savedInvoice.companyPhone && <div>Ph: {savedInvoice.companyPhone}</div>}
                  {savedInvoice.companyGstin && <div>GSTIN: {savedInvoice.companyGstin}</div>}
                  <div style={{ fontWeight: "bold", marginTop: 4 }}>RETAIL INVOICE / CASH MEMO</div>
                </div>

                <div className="pos-th-divider" />

                <div className="pos-th-row">
                  <span>Bill No: {savedInvoice.invoiceNumber}</span>
                  <span>{savedInvoice.invoiceDate}</span>
                </div>
                <div className="pos-th-row">
                  <span>Customer: {savedInvoice.customerName}</span>
                </div>
                {savedInvoice.customerPhone && (
                  <div className="pos-th-row">
                    <span>Phone: {savedInvoice.customerPhone}</span>
                  </div>
                )}

                <div className="pos-th-divider" />

                {/* Items */}
                <div className="pos-th-items-head">
                  <div className="pos-th-col-name">Item</div>
                  <div className="pos-th-col-qty">Qty</div>
                  <div className="pos-th-col-rate">Rate</div>
                  <div className="pos-th-col-total">Amt</div>
                </div>

                {savedInvoice.items.map((it, i) => (
                  <div key={i} className="pos-th-item-row">
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div className="pos-th-row" style={{ fontSize: "11px" }}>
                      <span>
                        {it.quantity} x {fmtCurrency(it.unitRate)}
                      </span>
                      <span>{fmtCurrency(it.lineTotal)}</span>
                    </div>
                  </div>
                ))}

                <div className="pos-th-divider" />

                <div className="pos-th-row">
                  <span>Taxable:</span>
                  <span>{fmtCurrency(savedInvoice.totals.subtotal)}</span>
                </div>
                <div className="pos-th-row">
                  <span>Total GST:</span>
                  <span>{fmtCurrency(savedInvoice.totals.totalTax)}</span>
                </div>
                <div className="pos-th-row" style={{ fontSize: "14px", fontWeight: "bold", marginTop: 4 }}>
                  <span>GRAND TOTAL:</span>
                  <span>{fmtCurrency(savedInvoice.totals.grandTotal)}</span>
                </div>

                <div className="pos-th-divider" />

                <div className="pos-th-row">
                  <span>Payment Mode:</span>
                  <span>{savedInvoice.paymentMode}</span>
                </div>
                {savedInvoice.paymentMode === "CASH" && (
                  <>
                    <div className="pos-th-row">
                      <span>Tendered:</span>
                      <span>{fmtCurrency(savedInvoice.cashTendered)}</span>
                    </div>
                    <div className="pos-th-row">
                      <span>Change:</span>
                      <span>{fmtCurrency(savedInvoice.changeToReturn)}</span>
                    </div>
                  </>
                )}

                {/* QR Code for UPI */}
                {savedInvoice.paymentMode === "UPI" && (
                  <div className="pos-thermal-center" style={{ marginTop: 10 }}>
                    <QRCodeSVG
                      value={`upi://pay?pa=${savedInvoice.upiId}&pn=${encodeURIComponent(savedInvoice.companyName)}&am=${savedInvoice.totals.grandTotal}&cu=INR`}
                      size={90}
                    />
                    <div style={{ fontSize: "10px", marginTop: 4 }}>Scan & Pay via any UPI App</div>
                  </div>
                )}

                <div className="pos-thermal-center" style={{ marginTop: 12, fontSize: "11px" }}>
                  *** Thank You! Visit Again! ***
                </div>
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-print"
                onClick={triggerThermalPrint}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                type="button"
                className="pos-btn-new-sale"
                onClick={startNewSale}
              >
                <Plus size={16} /> Next Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          4. Modal: Recall Held Bills
          ==================================================================== */}
      {showHeldModal && (
        <div className="pos-modal-overlay" onClick={() => setShowHeldModal(false)}>
          <div className="pos-modal-card pos-held-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h3>
                <PauseCircle size={18} className="text-warning" />
                <span>Parked / Held Bills ({heldBills.length})</span>
              </h3>
              <button
                type="button"
                className="pos-modal-close"
                onClick={() => setShowHeldModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-receipt-scroll">
              {heldBills.length === 0 ? (
                <div className="pos-empty-cart">
                  <p className="pos-empty-cart-text">No held bills parked</p>
                </div>
              ) : (
                heldBills.map((b) => (
                  <div key={b.id} className="pos-held-item-row">
                    <div className="pos-held-meta-left">
                      <span className="pos-held-customer">
                        {b.customer?.customerName || "Walk-in Customer"}
                      </span>
                      <span className="pos-held-time">
                        {b.timestamp} • {b.itemCount} Items • <strong>{fmtCurrency(b.grandTotal)}</strong>
                      </span>
                    </div>

                    <div className="pos-held-actions">
                      <button
                        type="button"
                        className="pos-btn-icon-subtle"
                        style={{ color: "#16a34a", borderColor: "#86efac", background: "#f0fdf4" }}
                        onClick={() => handleRecallBill(b)}
                        title="Resume this Bill"
                      >
                        <PlayCircle size={15} /> Resume
                      </button>
                      <button
                        type="button"
                        className="pos-btn-icon-subtle"
                        style={{ color: "#dc2626" }}
                        onClick={() => handleDeleteHeldBill(b.id)}
                        title="Discard this Bill"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          5. Modal: Quick Add Customer
          ==================================================================== */}
      {showAddCustomerModal && (
        <div className="pos-modal-overlay" onClick={() => setShowAddCustomerModal(false)}>
          <div className="pos-modal-card" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h3>
                <UserPlus size={18} className="text-primary" />
                <span>Quick Add Customer</span>
              </h3>
              <button
                type="button"
                className="pos-modal-close"
                onClick={() => setShowAddCustomerModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                    }}
                    placeholder="Enter customer name"
                    value={newCustomerData.customerName}
                    onChange={(e) =>
                      setNewCustomerData((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                    }}
                    placeholder="10-digit mobile number"
                    value={newCustomerData.phone}
                    onChange={(e) =>
                      setNewCustomerData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Type
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                    }}
                    value={newCustomerData.customerType}
                    onChange={(e) =>
                      setNewCustomerData((prev) => ({ ...prev, customerType: e.target.value }))
                    }
                  >
                    <option value="Individual">Individual / Retail</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
              </div>

              <div className="pos-modal-footer">
                <button
                  type="button"
                  className="pos-btn-icon-subtle"
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pos-btn-print"
                  disabled={creatingCustomer}
                >
                  {creatingCustomer ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ====================================================================
          6. Modal: Camera Barcode Scanner (myBillBook style)
          ==================================================================== */}
      <ScanBarcodeModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onFound={(item) => {
          if (item?.product) {
            addToCart(item.product);
          } else if (item) {
            addToCart(item);
          }
        }}
      />
    </div>
  );
}
