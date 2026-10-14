import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin, Percent, Phone, UserPlus, X } from "lucide-react";

const PartySelect = ({
  label = "Party",
  parties = [],
  value = null,
  onChange,
  loading = false,
  placeholder = "Select party",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = parties.filter((party) => {
    const text = search.trim().toLowerCase();

    if (!text) return true;

    return [
      party.customerName,
      party.customerCode,
      party.phone,
      party.gstNo,
    ]
      .filter(Boolean)
      .some((field) =>
        String(field).toLowerCase().includes(text),
      );
  });

  const selected = value
    ? parties.find((party) => party._id === value)
    : null;

  return (
    <div className="form-field" ref={wrapperRef} style={{ position: "relative" }}>
      <label className="form-label">
        {label}
      </label>

      {!selected ? (
        <button
          type="button"
          className="party-trigger"
          onClick={() => setOpen((previous) => !previous)}
        >
          <UserPlus size={16} />
          <span>{placeholder}</span>
          <ChevronDown size={14} />
        </button>
      ) : (
        <div className="party-selected">
          <div className="party-avatar">
            {selected.customerName?.charAt(0)?.toUpperCase()}
          </div>

          <div className="party-info">
            <strong>{selected.customerName}</strong>

            {selected.phone && (
              <span className="party-meta">
                <Phone size={11} /> {selected.phone}
              </span>
            )}

            {(selected.billingAddress || selected.city) && (
              <span className="party-meta">
                <MapPin size={11} />{" "}
                {[selected.billingAddress, selected.city, selected.state]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}

            {selected.gstNo && (
              <span className="party-meta">
                <Percent size={11} /> GSTIN: {selected.gstNo}
              </span>
            )}
          </div>

          <button
            type="button"
            className="party-remove"
            onClick={() => onChange(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {open && (
        <div className="party-dropdown">
          <div style={{ padding: "10px" }}>
            <input
              className="form-input"
              placeholder="Search name, phone, GSTIN..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading && (
            <div className="party-option">Loading parties...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="party-option">No parties found</div>
          )}

          {filtered.map((party) => (
            <button
              key={party._id}
              type="button"
              className="party-option"
              onClick={() => {
                onChange(party);
                setOpen(false);
                setSearch("");
              }}
            >
              <div className="party-option-name">
                {party.customerName}
              </div>

              <div className="party-option-meta">
                {party.customerCode}
                {party.phone ? ` • ${party.phone}` : ""}
                {party.gstNo ? ` • ${party.gstNo}` : ""}
              </div>

              {(party.billingAddress || party.city) && (
                <div className="party-option-meta">
                  {[party.billingAddress, party.city, party.state]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartySelect;