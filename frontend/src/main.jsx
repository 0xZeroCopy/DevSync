import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Handle Google OAuth Popup Redirect Callback
if (window.opener && window.location.hash.includes("access_token")) {
  try {
    window.opener.postMessage(
      { type: "GOOGLE_OAUTH_RESPONSE", hash: window.location.hash },
      window.location.origin
    );
  } catch {}
  window.close();
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

