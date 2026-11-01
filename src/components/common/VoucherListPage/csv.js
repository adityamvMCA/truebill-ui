const csvCell = (v) => {
  let t = String(v ?? "");
  if (/^\s*[=+\-@]/.test(t)) t = `'${t}`; // CSV-injection guard
  return `"${t.replace(/"/g, '""')}"`;
};

export const downloadCsv = ({ fileName, meta = [], columns, rows, footer = [] }) => {
  const header = columns.map((c) => c.header);
  const body = rows.map((r) => columns.map((c) => c.value(r)));
  const csv = [...meta, header, ...body, ...footer]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};