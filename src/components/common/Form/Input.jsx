import {
  forwardRef,
} from "react";

const Input = forwardRef(
  (
    {
      label,
      name,
      type = "text",
      value = "",
      onChange,
      placeholder = "",
      error,
      required = false,
      disabled = false,
      readOnly = false,
      icon: Icon,
      className = "",
      min,
      max,
      step,
      autoComplete = "off",
      ...rest
    },
    ref
  ) => {
    return (
      <div className="form-field">
        {label && (
          <label
            htmlFor={name}
            className="form-label"
          >
            {label}

            {required && (
              <span className="form-required">
                *
              </span>
            )}
          </label>
        )}

        <div
          className={`form-input-wrapper ${
            Icon ? "has-icon" : ""
          }`}
        >
          {Icon && (
            <span className="form-input-icon">
              <Icon size={15} />
            </span>
          )}

          <input
            ref={ref}
            id={name}
            name={name}
            type={type}
            value={value ?? ""}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            min={min}
            max={max}
            step={step}
            autoComplete={autoComplete}
            className={`form-input ${
              error ? "has-error" : ""
            } ${className}`}
            {...rest}
          />
        </div>

        {error && (
          <span className="form-error">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;