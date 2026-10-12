function SegmentedControl({ label, value, onChange, options }) {
  return (
    <div className="fp-field">
      {label && <label>{label}</label>}
      <div className="fp-segment" role="radiogroup">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={value === option.value ? "active" : ""}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SegmentedControl;