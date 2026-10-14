import { useEffect, useMemo, useRef, useState } from "react";

import { Search, UserPlus, X } from "lucide-react";

const formatAddress = (customer) =>
  [
    customer.billingAddress,
    customer.city,
    customer.state,
    customer.pincode,
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");

function CustomerPicker({ customers, selected, disabled, loading, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    searchRef.current?.focus();

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.customerName,
        customer.customerCode,
        customer.gstNo,
        customer.phone,
        customer.city,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [customers, query]);

  const visible = filtered.slice(0, 100);

  const choose = (customer) => {
    onSelect(customer);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="doc-picker" ref={rootRef}>
      {selected ? (
        <div className="doc-party-card">
          <div className="doc-avatar">
            {selected.customerName?.charAt(0).toUpperCase()}
          </div>

          <div className="doc-party-copy">
            <h3>{selected.customerName}</h3>
            <p>{selected.customerCode}</p>

            <p>
              <span>Address:</span> {formatAddress(selected) || "Not provided"}
            </p>

            <p>
              <span>GSTIN:</span> {selected.gstNo || "Not provided"}
            </p>

            <p>
              <span>Phone:</span> {selected.phone || "Not provided"}
            </p>

            <button
              type="button"
              className="doc-link-button"
              disabled={disabled}
              onClick={() => setOpen((previous) => !previous)}
            >
              Change customer
            </button>
          </div>

          <button
            type="button"
            className="doc-icon-button"
            disabled={disabled}
            aria-label="Remove customer"
            onClick={() => onSelect(null)}
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="doc-dashed-box"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          <UserPlus size={19} />

          <span>{loading ? "Loading customers..." : "+ Select Customer"}</span>
        </button>
      )}

      {open && (
        <div className="doc-picker-panel">
          <div className="doc-picker-search">
            <Search size={15} />

            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search name, code, GST, phone..."
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search customers"
            />
          </div>

          <div className="doc-picker-list" role="listbox">
            {visible.map((customer) => (
              <button
                key={customer._id}
                type="button"
                role="option"
                aria-selected={selected?._id === customer._id}
                className="doc-picker-option"
                onClick={() => choose(customer)}
              >
                <strong>{customer.customerName}</strong>

                <span>
                  {customer.customerCode}
                  {customer.gstNo ? ` · ${customer.gstNo}` : ""}
                  {customer.city ? ` · ${customer.city}` : ""}
                </span>
              </button>
            ))}

            {!visible.length && (
              <p className="doc-picker-empty">
                {customers.length
                  ? "No customers match your search."
                  : "No active customers found. Create a customer first."}
              </p>
            )}

            {filtered.length > visible.length && (
              <p className="doc-picker-empty">
                Showing the first {visible.length} matches. Refine your search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerPicker;
