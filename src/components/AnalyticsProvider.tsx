import { useEffect } from "react";
import { ANALYTICS_CONFIG } from "@/lib/analytics";

interface HotjarWindow extends Window {
  hj: ((...args: unknown[]) => void) & { q?: unknown[] };
  _hjSettings?: { hjid: number; hjsv: number };
}

const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Skip if IDs aren't configured
    if (ANALYTICS_CONFIG.googleAnalyticsId === "G-XXXXXXXXXX") {
      console.log("[Analytics] Google Analytics not configured - using placeholder ID");
    }
    if (ANALYTICS_CONFIG.hotjarSiteId === "0000000") {
      console.log("[Analytics] Hotjar not configured - using placeholder ID");
    }

    // Initialize Google Analytics
    if (ANALYTICS_CONFIG.googleAnalyticsId !== "G-XXXXXXXXXX") {
      const gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.googleAnalyticsId}`;
      document.head.appendChild(gaScript);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", ANALYTICS_CONFIG.googleAnalyticsId, {
        send_page_view: true,
      });

      console.log("[Analytics] Google Analytics initialized");
    }

    // Initialize Hotjar
    if (ANALYTICS_CONFIG.hotjarSiteId !== "0000000") {
      const hjWindow = window as HotjarWindow;
      hjWindow.hj = hjWindow.hj || function(...args: unknown[]) {
        (hjWindow.hj.q = hjWindow.hj.q || []).push(args);
      };
      hjWindow._hjSettings = {
        hjid: parseInt(ANALYTICS_CONFIG.hotjarSiteId),
        hjsv: 6,
      };
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://static.hotjar.com/c/hotjar-${hjWindow._hjSettings.hjid}.js?sv=6`;
      document.head.appendChild(script);

      console.log("[Analytics] Hotjar initialized");
    }
  }, []);

  return <>{children}</>;
};

export default AnalyticsProvider;
