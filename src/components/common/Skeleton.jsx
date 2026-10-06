import React from "react";
import "./skeleton.css";

const repeat = (count) =>
  Array.from({ length: count }, (_, index) => index);

function Skeleton({
  type = "page",
  rows = 8,
  columns = 6,
  fields = 8,
  cards = 4,
  sections = 2,
  items = 4,
  showHeader = true,
  showPagination = true,
}) {
  if (type === "list") {
    return (
      <div className="skeleton-page">

        {showHeader && (
          <SkeletonHeader />
        )}

        <div className="sk-list-card">

          <div className="sk-list-toolbar">
            <SkBlock className="sk-search" />

            <div className="sk-toolbar-actions">
              <SkBlock className="sk-button" />
              <SkBlock className="sk-button" />
              <SkBlock className="sk-button" />
            </div>
          </div>

          <div className="sk-table-wrapper">
            <div
              className="sk-table"
              style={{
                "--sk-columns": columns,
              }}
            >

              <div className="sk-table-row sk-table-head">
                {repeat(columns).map((item) => (
                  <SkBlock
                    key={item}
                    className="sk-table-cell"
                  />
                ))}
              </div>

              {repeat(rows).map((row) => (
                <div
                  className="sk-table-row"
                  key={row}
                >
                  {repeat(columns).map((column) => (
                    <SkBlock
                      key={column}
                      className="sk-table-cell"
                    />
                  ))}
                </div>
              ))}

            </div>
          </div>

          {showPagination && (
            <SkeletonPagination />
          )}

        </div>
      </div>
    );
  }

  if (type === "form") {
    return (
      <div className="skeleton-page">

        {showHeader && (
          <SkeletonHeader />
        )}

        <div className="sk-form-card">

          {repeat(fields).map((field) => (
            <div
              className="sk-form-field"
              key={field}
            >
              <SkBlock className="sk-label" />
              <SkBlock className="sk-input" />
            </div>
          ))}

          <div className="sk-form-actions">
            <SkBlock className="sk-button" />
            <SkBlock className="sk-button sk-button-primary" />
          </div>

        </div>
      </div>
    );
  }

  if (type === "detail") {
    return (
      <div className="skeleton-page">

        {showHeader && (
          <SkeletonHeader />
        )}

        {repeat(sections).map((section) => (
          <div
            className="sk-detail-card"
            key={section}
          >

            <SkBlock className="sk-section-title" />

            <div className="sk-detail-grid">
              {repeat(fields).map((field) => (
                <div
                  className="sk-detail-field"
                  key={field}
                >
                  <SkBlock className="sk-label" />
                  <SkBlock className="sk-detail-value" />
                </div>
              ))}
            </div>

          </div>
        ))}

      </div>
    );
  }

  if (type === "modal") {
    return (
      <div className="sk-modal">

        <div className="sk-modal-header">
          <SkBlock className="sk-modal-title" />
          <SkBlock className="sk-close" />
        </div>

        <div className="sk-modal-body">

          {repeat(fields).map((field) => (
            <div
              className="sk-form-field"
              key={field}
            >
              <SkBlock className="sk-label" />
              <SkBlock className="sk-input" />
            </div>
          ))}

        </div>

        <div className="sk-modal-footer">
          <SkBlock className="sk-button" />
          <SkBlock className="sk-button sk-button-primary" />
        </div>

      </div>
    );
  }

  if (type === "dashboard") {
    return (
      <div className="skeleton-page">

        {showHeader && (
          <SkeletonHeader />
        )}

        <div className="sk-dashboard-cards">
          {repeat(cards).map((card) => (
            <div
              className="sk-dashboard-card"
              key={card}
            >
              <SkBlock className="sk-small-line" />
              <SkBlock className="sk-large-line" />
              <SkBlock className="sk-medium-line" />
            </div>
          ))}
        </div>

        <div className="sk-dashboard-content">

          <div className="sk-chart-card">
            <SkBlock className="sk-section-title" />
            <SkBlock className="sk-chart" />
          </div>

          <div className="sk-chart-card">
            <SkBlock className="sk-section-title" />
            <SkBlock className="sk-chart" />
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="skeleton-page">

      <SkeletonHeader />

      <div className="sk-generic-card">
        {repeat(6).map((item) => (
          <SkBlock
            key={item}
            className="sk-generic-line"
          />
        ))}
      </div>

    </div>
  );
}

function SkeletonHeader() {
  return (
    <div className="sk-page-header">

      <div>
        <SkBlock className="sk-title" />
        <SkBlock className="sk-subtitle" />
      </div>

      <div className="sk-header-actions">
        <SkBlock className="sk-button" />
        <SkBlock className="sk-button" />
      </div>

    </div>
  );
}

function SkeletonPagination() {
  return (
    <div className="sk-pagination">

      <SkBlock className="sk-pagination-info" />

      <div className="sk-pagination-buttons">
        <SkBlock className="sk-page-button" />
        <SkBlock className="sk-page-button" />
        <SkBlock className="sk-page-button" />
        <SkBlock className="sk-page-button" />
      </div>

    </div>
  );
}

function SkBlock({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`sk-block ${className}`}
    />
  );
}

export default Skeleton;