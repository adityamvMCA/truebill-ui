import {
  forwardRef,
} from "react";

const Button = forwardRef(
  (
    {
      children,

      type = "button",

      variant = "primary",

      size = "medium",

      icon: Icon,

      loading = false,

      disabled = false,

      fullWidth = false,

      className = "",

      onClick,

      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={
          disabled || loading
        }
        className={`
          form-button
          form-button-${variant}
          form-button-${size}
          ${fullWidth ? "form-button-full" : ""}
          ${className}
        `}
        {...rest}
      >

        {loading && (
          <span className="form-button-spinner" />
        )}

        {!loading && Icon && (
          <Icon size={15} />
        )}

        <span>
          {children}
        </span>

      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;