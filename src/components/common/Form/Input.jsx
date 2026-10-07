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

      autoComplete,

      ...rest
    },
    ref
  ) => {
    return (
      <div className={`form-field ${className}`}>

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
            Icon
              ? "form-input-with-icon"
              : ""
          } ${
            error
              ? "form-input-error"
              : ""
          }`}
        >
          {Icon && (
            <Icon
              className="form-input-icon"
              size={15}
            />
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
            className="form-input"
            {...rest}
          />
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;