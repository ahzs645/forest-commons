import { LanguageProvider } from "./i18n";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./RegionalApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider><App /></LanguageProvider>
  </React.StrictMode>,
);
