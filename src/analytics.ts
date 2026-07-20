declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = "G-2R8KZB3YJ7";

function isGtagAvailable() {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackPageView(path: string, title?: string) {
  if (!isGtagAvailable()) return;
  window.gtag("event", "page_view", {
    send_to: GA_MEASUREMENT_ID,
    page_path: path,
    page_title: title,
    page_location: window.location.origin + window.location.pathname + path,
  });
}

type EventParams = Record<string, unknown> & {
  event_category?: string;
  event_label?: string;
  value?: number;
};

export function trackEvent(action: string, params: EventParams = {}) {
  if (!isGtagAvailable()) return;
  window.gtag("event", action, {
    send_to: GA_MEASUREMENT_ID,
    ...params,
  });
}

export const GA_ID = GA_MEASUREMENT_ID;