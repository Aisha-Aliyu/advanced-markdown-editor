import "./styles/fonts.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Older versions kept signed-in Supabase answers in this cache. Nothing uses it now.
if ("caches" in window) caches.delete("supabase-cache").catch(() => {});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
