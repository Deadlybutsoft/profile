import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

declare global {
  interface Window {
    onToggleAI?: () => void;
  }
}

// Compatibility guard for stale cached bundles that may reference a global onToggleAI.
if (typeof window.onToggleAI !== "function") {
  window.onToggleAI = () => {};
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

createRoot(container).render(<App />);
