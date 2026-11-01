import "../../common/VoucherListPage/VoucherListPage.css";
import "../../common/Skeleton/ListPageSkeleton.css";

const WIDTHS = [88, 70, 60, 92, 55, 65, 75, 50];

export const Sk = ({ w = "100%", h = 14, r, style }) => (
  <span
    aria-hidden="true"
    className="lps-block"
    style={{ width: w, height: h, ...(r ? { borderRadius: r } : null), ...style }}
  />
);

/** Summary cards placeholder (same .jv-card markup as the real cards). */
export function CardsSkeleton({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <article className="jv-card" key={i} aria-hidden="true">
      <Sk w={90} h={12} />
      <Sk w={120} h={26} style={{ margin: "10px 0" }} />
      <Sk w={140} h={11} />
    </article>
  ));
}

/** Table body rows placeholder. */
export function TableSkeletonRows({ columns = 6, rows = 10 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} aria-hidden="true">
      {Array.from({ length: columns }, (_, c) => (
        <td key={c}>
          <Sk w={`${WIDTHS[(r + c * 3) % WIDTHS.length]}%`} h={14} />
        </td>
      ))}
    </tr>
  ));
}

/** Whole-page skeleton: use as the React.lazy / Suspense fallback. */
export default function ListPageSkeleton({ columns = 6, cardCount = 4, rows = 10 }) {
  return (
    <main className="jv-page" aria-busy="true" aria-label="Loading">
      <header className="jv-header">
        <div className="jv-heading">
          <Sk w={36} h={36} r={8} />
          <div className="jv-title lps-stack">
            <Sk w={190} h={24} />
            <Sk w={300} h={13} />
          </div>
        </div>
        <div className="jv-actions">
          <Sk w={100} h={38} r={8} />
          <Sk w={100} h={38} r={8} />
        </div>
      </header>

      <section className="jv-cards">
        <CardsSkeleton count={cardCount} />
      </section>

      <section className="jv-filters">
        <Sk h={40} r={8} style={{ flex: 1, minWidth: 220 }} />
        <Sk w={140} h={40} r={8} />
        <Sk w={140} h={40} r={8} />
        <Sk w={160} h={40} r={8} />
      </section>

      <div className="jv-chips">
        {Array.from({ length: 6 }, (_, i) => (
          <Sk key={i} w={72} h={30} r={999} />
        ))}
      </div>

      <section className="jv-table-card">
        <div className="jv-table-scroll">
          <table className="jv-table">
            <thead>
              <tr>
                {Array.from({ length: columns }, (_, i) => (
                  <th key={i}>
                    <Sk w={60} h={12} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableSkeletonRows columns={columns} rows={rows} />
            </tbody>
          </table>
        </div>
        <div className="jv-pagination">
          <Sk w={160} h={14} />
          <div className="jv-pager">
            {Array.from({ length: 5 }, (_, i) => (
              <Sk key={i} w={34} h={32} r={8} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}