import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initExternalRouter } from "./integrations/supabase/external";

// Fire-and-forget — routing decisions use a localStorage cache so the first
// render is not blocked while the config is fetched.
initExternalRouter();

createRoot(document.getElementById("root")!).render(<App />);
