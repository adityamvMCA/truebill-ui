function FormCard({ title, description, icon: Icon, children }) {
  return (
    <section className="fp-card">
      <div className="fp-card-head">
        {Icon && (
          <span className="fp-card-icon">
            <Icon size={16} />
          </span>
        )}
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="fp-card-body">{children}</div>
    </section>
  );
}

export default FormCard;