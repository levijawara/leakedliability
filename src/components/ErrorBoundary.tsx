import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary
 * 
 * Catches unhandled React errors and prevents the entire app from crashing.
 * Shows a user-friendly error message instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details to console for debugging
    console.error("[ErrorBoundary] Caught an error:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // Update state with error info for display
    this.setState({
      error,
      errorInfo,
    });

    // In production, you might want to send this to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            fontFamily: "system-ui, -apple-system, sans-serif",
            backgroundColor: "#fafafa",
          }}
        >
          <div
            style={{
              maxWidth: 600,
              width: "100%",
              padding: 32,
              backgroundColor: "white",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #e5e5e5",
            }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: "bold",
                marginBottom: 16,
                color: "#dc2626",
              }}
            >
              Something went wrong
            </h1>

            <p style={{ marginBottom: 24, lineHeight: 1.6, color: "#404040" }}>
              We encountered an unexpected error. The page may not be working
              correctly right now.
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#1d4ed8";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }}
              >
                Reload Page
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#4b5563";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#6b7280";
                }}
              >
                Try Again
              </button>

              <a
                href="/"
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "inline-block",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
              >
                Go to Homepage
              </a>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details
                style={{
                  marginTop: 24,
                  padding: 16,
                  backgroundColor: "#f9fafb",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 500,
                    marginBottom: 12,
                    color: "#6b7280",
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: "#dc2626",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Stack:</strong>
                      <pre
                        style={{
                          marginTop: 8,
                          padding: 8,
                          backgroundColor: "#1f2937",
                          color: "#f3f4f6",
                          borderRadius: 4,
                          overflow: "auto",
                          maxHeight: 300,
                        }}
                      >
                        {this.state.error.stack}
                      </pre>
                      <strong style={{ display: "block", marginTop: 12 }}>
                        Component Stack:
                      </strong>
                      <pre
                        style={{
                          marginTop: 8,
                          padding: 8,
                          backgroundColor: "#1f2937",
                          color: "#f3f4f6",
                          borderRadius: 4,
                          overflow: "auto",
                          maxHeight: 200,
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

