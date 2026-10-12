import { Component } from "react";

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error(
      "Route rendering error:",
      error,
      info
    );
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              background: "var(--card-bg)",
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "18px",
              }}
            >
              Unable to load this page
            </h2>

            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              Check the browser console for the
              exact error, then reload the page.
            </p>

            <button
              type="button"
              className="so-primary-button"
              onClick={this.handleReload}
              style={{
                marginTop: "16px",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;