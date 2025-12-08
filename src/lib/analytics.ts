// Analytics configuration
export const ANALYTICS_CONFIG = {
  googleAnalyticsId: "G-XXXXXXXXXX", // Replace with your GA4 Measurement ID
  hotjarSiteId: "0000000", // Replace with your Hotjar Site ID
};

// Google Analytics helper
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
    hj: (...args: unknown[]) => void;
  }
}

// Track custom events to Google Analytics
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, string | number | boolean>
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, parameters);
    console.log("[Analytics] Event tracked:", eventName, parameters);
  }
};

// Hotjar event tracking
export const trackHotjarEvent = (eventName: string) => {
  if (typeof window !== "undefined" && window.hj) {
    window.hj("event", eventName);
    console.log("[Hotjar] Event tracked:", eventName);
  }
};

// Combined tracking for important events
export const analytics = {
  // Photo/scan events
  photoSubmitted: (location: string) => {
    trackEvent("photo_submitted", { location });
    trackHotjarEvent("photo_submitted");
  },

  classificationReceived: (category: string, item: string, confidence: number, ruleBasis: string) => {
    trackEvent("classification_received", {
      category,
      item,
      confidence,
      rule_basis: ruleBasis,
    });
    trackHotjarEvent("classification_received");
  },

  // Quiz events
  quizStarted: () => {
    trackEvent("quiz_started");
    trackHotjarEvent("quiz_started");
  },

  quizCompleted: (wasCorrect: boolean, category: string) => {
    trackEvent("quiz_completed", { was_correct: wasCorrect, category });
    trackHotjarEvent("quiz_completed");
  },

  quizSkipped: () => {
    trackEvent("quiz_skipped");
    trackHotjarEvent("quiz_skipped");
  },

  // Location events
  locationSet: (location: string, method: "gps" | "ip" | "manual") => {
    trackEvent("location_set", { location, method });
    trackHotjarEvent("location_set");
  },

  locationRulesFetched: (location: string, ruleBasis: string) => {
    trackEvent("location_rules_fetched", { location, rule_basis: ruleBasis });
  },

  // Engagement events
  shareClicked: (shareType: "screenshot" | "text") => {
    trackEvent("share_clicked", { share_type: shareType });
    trackHotjarEvent("share_clicked");
  },

  learnMoreExpanded: () => {
    trackEvent("learn_more_expanded");
    trackHotjarEvent("learn_more_expanded");
  },

  questionAsked: (resultCategory: string) => {
    trackEvent("question_asked", { result_category: resultCategory });
    trackHotjarEvent("question_asked");
  },

  sourceClicked: (sourceName: string) => {
    trackEvent("source_clicked", { source_name: sourceName });
  },

  // Onboarding events
  onboardingStarted: () => {
    trackEvent("onboarding_started");
    trackHotjarEvent("onboarding_started");
  },

  onboardingCompleted: () => {
    trackEvent("onboarding_completed");
    trackHotjarEvent("onboarding_completed");
  },

  // Error events
  classificationError: (errorMessage: string) => {
    trackEvent("classification_error", { error_message: errorMessage });
    trackHotjarEvent("classification_error");
  },
};
