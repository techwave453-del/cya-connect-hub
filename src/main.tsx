import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSyncListener } from "./lib/syncManager";

// Register service worker for offline support and background sync
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[App] Service Worker registered:", reg);

      // Listen for messages from service worker (e.g., background sync trigger)
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "cya-sync") {
          console.log("[App] Received sync message from SW");
          // Trigger sync manager
          const { syncWithServer } = require("./lib/syncManager");
          syncWithServer();
        }
      });
    } catch (error) {
      console.error("[App] Service Worker registration failed:", error);
    }
  });
}

// Initialize sync listener for online/offline events
initSyncListener();

createRoot(document.getElementById("root")!).render(<App />);
