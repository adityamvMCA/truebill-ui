import {
  forwardRef,
} from "react";

import { ChevronDown } from "lucide-react";

const Select = forwardRef(
  (
    {
      label,
      name,

      value = "",
      onChange,

      options = [],

      placeholder = "Select...",

      error,
      required = false,

      disabled = false,

      icon: Icon,

      className = "",

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
          className={`form-input-wrapper form-select-wrapper ${
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

          <select
            ref={ref}
            id={name}
            name={name}
            value={value ?? ""}
            onChange={onChange}
            disabled={disabled}
            className={`form-select ${
              Icon
                ? "form-select-with-icon"
                : ""
            }`}
            {...rest}
          >
            <option value="">
              {placeholder}
            </option>

            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={
                  option.disabled
                }
              >
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown
            size={15}
            className="form-select-arrow"
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

Select.displayName = "Select";

export default Select;