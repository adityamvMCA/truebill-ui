import React from "react";

function GlobalSkeleton() {
  return (
    <div className="global-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-actions">
          <div className="skeleton-box" />
          <div className="skeleton-box" />
        </div>
      </div>

      <div className="skeleton-card-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>

      <div className="skeleton-content-card">
        <div className="skeleton-toolbar">
          <div className="skeleton-line skeleton-search" />
          <div className="skeleton-box skeleton-button" />
        </div>

        <div className="skeleton-table">
          <div className="skeleton-table-header">
            <div />
            <div />
            <div />
            <div />
            <div />
          </div>

          {Array.from({ length: 8 }).map((_, index) => (
            <div
              className="skeleton-table-row"
              key={index}
            >
              <div />
              <div />
              <div />
              <div />
              <div />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GlobalSkeleton;