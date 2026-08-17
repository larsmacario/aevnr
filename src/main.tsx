import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import { PreferencesProvider } from "./lib/preferences";
import { I18nProvider } from "./lib/i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <PreferencesProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </PreferencesProvider>
    </AuthProvider>
  </StrictMode>,
);
