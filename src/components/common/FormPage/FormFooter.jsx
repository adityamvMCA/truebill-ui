function FormFooter({ onCancel, onSubmit, submitText = "Save", saving = false, error }) {
  return (
    <footer className="fp-footer">
      {error && <span className="fp-footer-error" role="alert">{error}</span>}

      <div className="fp-footer-actions">
        <button type="button" className="fp-btn fp-btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="so-primary-button fp-submit" onClick={onSubmit} disabled={saving}>
          {saving ? "Saving..." : submitText}
        </button>
      </div>
    </footer>
  );
}

export default FormFooter;