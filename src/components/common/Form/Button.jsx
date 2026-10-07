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
        disabled={disabled || loading}
        onClick={onClick}
        className={`
          form-button
          form-button-${variant}
          form-button-${size}
          ${fullWidth ? "form-button-full" : ""}
          ${className}
        `}
        {...rest}
      >
        {loading ? (
          <span className="form-button-spinner" />
        ) : (
          Icon && <Icon size={15} />
        )}

        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;