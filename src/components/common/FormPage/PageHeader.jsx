import { ArrowLeft } from "lucide-react";

function PageHeader({ title, subtitle, onBack, actions }) {
  return (
    <header className="fp-header">
      <div className="fp-header-left">
        {onBack && (
          <button type="button" className="fp-back" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="fp-header-actions">{actions}</div>}
    </header>
  );
}

export default PageHeader;