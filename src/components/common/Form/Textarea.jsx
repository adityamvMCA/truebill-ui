import {
  forwardRef,
} from "react";

const Textarea = forwardRef(
  (
    {
      label,
      name,
      value = "",
      onChange,
      placeholder = "",
      error,
      required = false,
      disabled = false,
      readOnly = false,
      rows = 3,
      className = "",
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

        <textarea
          ref={ref}
          id={name}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          className={`form-textarea ${
            error ? "has-error" : ""
          } ${className}`}
          {...rest}
        />

        {error && (
          <span className="form-error">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;