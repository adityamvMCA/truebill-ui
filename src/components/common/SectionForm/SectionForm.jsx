import {
    ChevronDown,
    Eye,
    EyeOff,
} from "lucide-react";
import { useState } from "react";

import "./section-form.css";

const SectionForm = ({
    fields = [],
    values = {},
    errors = {},
    onChange,
    columns = 2,
    disabled = false,
}) => {
    const [showPasswords, setShowPasswords] =
        useState({});

    const handleChange = (
        field,
        event
    ) => {
        const value =
            field.type === "checkbox"
                ? event.target.checked
                : event.target.value;

        onChange?.(
            field.name,
            value,
            event
        );
    };

    const renderField = (field) => {
        const {
            name,
            label,
            type = "text",
            placeholder,
            required = false,
            options = [],
            rows = 3,
            colSpan = 1,
            min,
            max,
            step,
            disabled: fieldDisabled = false,
        } = field;

        const value =
            values[name] ??
            (type === "checkbox"
                ? false
                : "");

        const error = errors[name];

        const isDisabled =
            disabled || fieldDisabled;

        const fieldId =
            `section-field-${name}`;

        /* ==============================
           CHECKBOX
        ============================== */

        if (type === "checkbox") {
            return (
                <div className="section-form-field">
                    <label
                        className="section-form-checkbox"
                        htmlFor={fieldId}
                    >
                        <input
                            id={fieldId}
                            type="checkbox"
                            checked={Boolean(value)}
                            disabled={isDisabled}
                            onChange={(event) =>
                                handleChange(
                                    field,
                                    event
                                )
                            }
                        />

                        <span />

                        <strong>
                            {label}

                            {required && (
                                <em>*</em>
                            )}
                        </strong>
                    </label>

                    {error && (
                        <small className="section-form-error">
                            {error}
                        </small>
                    )}
                </div>
            );
        }

        /* ==============================
           SELECT
        ============================== */

        if (type === "select") {
            return (
                <div className="section-form-field">
                    <label htmlFor={fieldId}>
                        {label}

                        {required && (
                            <span>*</span>
                        )}
                    </label>

                    <div
                        className={`section-form-select-wrapper ${error
                                ? "section-form-error-field"
                                : ""
                            }`}
                    >
                        <select
                            id={fieldId}
                            name={name}
                            value={value}
                            disabled={isDisabled}
                            onChange={(event) =>
                                handleChange(
                                    field,
                                    event
                                )
                            }
                        >
                            <option value="">
                                {placeholder ||
                                    `Select ${label}`}
                            </option>

                            {options.map(
                                (option) => {
                                    const optionValue =
                                        typeof option ===
                                            "object"
                                            ? option.value
                                            : option;

                                    const optionLabel =
                                        typeof option ===
                                            "object"
                                            ? option.label
                                            : option;

                                    return (
                                        <option
                                            key={
                                                optionValue
                                            }
                                            value={
                                                optionValue
                                            }
                                        >
                                            {optionLabel}
                                        </option>
                                    );
                                }
                            )}
                        </select>

                        <ChevronDown
                            size={15}
                        />
                    </div>

                    {error && (
                        <small className="section-form-error">
                            {error}
                        </small>
                    )}
                </div>
            );
        }

        /* ==============================
           TEXTAREA
        ============================== */

        if (type === "textarea") {
            return (
                <div className="section-form-field">
                    <label htmlFor={fieldId}>
                        {label}

                        {required && (
                            <span>*</span>
                        )}
                    </label>

                    <textarea
                        id={fieldId}
                        name={name}
                        rows={rows}
                        value={value}
                        disabled={isDisabled}
                        placeholder={placeholder}
                        onChange={(event) =>
                            handleChange(
                                field,
                                event
                            )
                        }
                    />

                    {error && (
                        <small className="section-form-error">
                            {error}
                        </small>
                    )}
                </div>
            );
        }

        /* ==============================
           PASSWORD
        ============================== */

        const isPassword =
            type === "password";

        const inputType = isPassword
            ? showPasswords[name]
                ? "text"
                : "password"
            : type;

        /* ==============================
           NORMAL INPUT
        ============================== */

        return (
            <div className="section-form-field">
                <label htmlFor={fieldId}>
                    {label}

                    {required && (
                        <span>*</span>
                    )}
                </label>

                <div
                    className={`section-form-input-wrapper ${error
                            ? "section-form-error-field"
                            : ""
                        }`}
                >
                    <input
                        id={fieldId}
                        name={name}
                        type={inputType}
                        value={value}
                        disabled={isDisabled}
                        readOnly={field.readOnly}
                        placeholder={placeholder}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(event) =>
                            handleChange(
                                field,
                                event
                            )
                        }
                    />

                    {isPassword && (
                        <button
                            type="button"
                            onClick={() =>
                                setShowPasswords(
                                    (previous) => ({
                                        ...previous,
                                        [name]:
                                            !previous[name],
                                    })
                                )
                            }
                        >
                            {showPasswords[name] ? (
                                <EyeOff size={15} />
                            ) : (
                                <Eye size={15} />
                            )}
                        </button>
                    )}
                </div>

                {error && (
                    <small className="section-form-error">
                        {error}
                    </small>
                )}
            </div>
        );
    };

    return (
        <div
            className={`section-form-grid ${columns === 1
                    ? "section-form-grid-one"
                    : ""
                }`}
        >
            {fields.map((field) => (
                <div
                    key={field.name}
                    className={
                        field.colSpan === 2
                            ? "section-form-full"
                            : ""
                    }
                >
                    {renderField(field)}
                </div>
            ))}
        </div>
    );
};

export default SectionForm;