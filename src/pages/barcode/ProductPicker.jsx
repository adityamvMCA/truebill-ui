import { useEffect, useState } from "react";
import { searchProducts } from "./barcodeApi";

export default function ProductPicker({ value, onChange, disabled }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) { setRows([]); return undefined; }
    let live = true;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await searchProducts(q);
        if (live) setRows(res?.data?.data || []);
      } catch { if (live) setRows([]); } finally { if (live) setBusy(false); }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [text]);

  if (value) {
    return (
      <div className="bcx-picked">
        <div><strong>{value.name}</strong><span>{value.productCode} · {value.unit}</span></div>
        {!disabled && <button type="button" className="bcx-link" onClick={() => onChange(null)}>Change</button>}
      </div>
    );
  }
  return (
    <div className="bcx-picker">
      <input className="bcx-input" placeholder="Search product name or code…" value={text}
        onChange={(e) => setText(e.target.value)} disabled={disabled} />
      {busy && <p className="bcx-hint">Searching…</p>}
      {rows.length > 0 && (
        <ul className="bcx-picker-list">
          {rows.map((p) => (
            <li key={p._id}>
              <button type="button" onClick={() => onChange(p)}>
                <strong>{p.name}</strong><span>{p.productCode} · {p.unit}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
