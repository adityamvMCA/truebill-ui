import { X } from "lucide-react";

export default function BcxModal({ open, title, onClose, children, wide = false, transparentBody = false }) {
  if (!open) return null;
  return (
    <div className="bcx-modal-backdrop bcx-ui" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`bcx-modal ${wide ? "is-wide" : ""} ${transparentBody ? "is-transparent" : ""}`}>
        <header className="bcx-modal-head">
          <h3>{title}</h3>
          <button type="button" className="bcx-icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}
