import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Production environment variable validation
// Logs errors to console so they're visible in production logs
if (import.meta.env.PROD) {
  const required = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ];

  for (const key of required) {
    if (!import.meta.env[key]) {
      console.error(`[PROD ENV ERROR] Missing ${key}`);
    }
  }
}

// Global error handlers for unhandled promise rejections
// Error Boundaries only catch render errors, not async errors
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Unhandled Promise Rejection]", event.reason);
  // You can optionally show a toast or error message to the user here
  // For now, we just log it to prevent silent failures
});

window.addEventListener("error", (event) => {
  console.error("[Global Error Handler]", event.error);
  // Error Boundaries will catch React render errors,
  // but this catches other JavaScript errors
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Cannot mount application.");
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
