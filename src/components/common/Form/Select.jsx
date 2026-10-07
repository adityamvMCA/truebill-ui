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
      placeholder = "",
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

        <div className="form-select-wrapper">
          {Icon && (
            <span className="form-select-left-icon">
              <Icon size={15} />
            </span>
          )}

          <select
            ref={ref}
            id={name}
            name={name}
            value={value ?? ""}
            onChange={onChange}
            disabled={disabled}
            className={`form-select ${
              Icon ? "has-left-icon" : ""
            } ${error ? "has-error" : ""} ${className}`}
            {...rest}
          >
            {placeholder && (
              <option value="">
                {placeholder}
              </option>
            )}

            {options.map((option) => {
              const item =
                typeof option === "string"
                  ? {
                      value: option,
                      label: option,
                    }
                  : option;

              return (
                <option
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                >
                  {item.label}
                </option>
              );
            })}
          </select>

          <ChevronDown
            className="form-select-arrow"
            size={15}
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

Select.displayName = "Select";

export default Select;