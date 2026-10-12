function SummaryPanel({ title = "Summary", rows = [], highlight, children }) {
  return (
    <aside className="fp-summary">
      <h3>{title}</h3>

      <ul>
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <strong className={row.tone ? `fp-${row.tone}` : ""}>{row.value}</strong>
          </li>
        ))}
      </ul>

      {highlight && (
        <div className="fp-highlight">
          <span>{highlight.label}</span>
          <strong>{highlight.value}</strong>
        </div>
      )}

      {children}
    </aside>
  );
}

export default SummaryPanel;