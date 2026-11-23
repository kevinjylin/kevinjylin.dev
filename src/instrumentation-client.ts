import posthog from "posthog-js";

// Visitor analytics. Next runs this file once in the browser, before the page hydrates.
// It stays off without a key, and in `next dev`, so local browsing never lands in the numbers.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key && process.env.NODE_ENV === "production") {
  posthog.init(key, {
    // Sent through this site's own /ingest (see the rewrites in next.config.ts), so ad blockers
    // that block PostHog's domain don't drop the visit
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-08-30",
    // Client-side navigations count as page views too
    capture_pageview: "history_change",
    // Nothing is kept in cookies or storage, so the site needs no consent banner. Each fresh
    // load reads as a new visitor; switch to "localStorage+cookie" to tell returning ones apart.
    persistence: "memory",
  });

  document.addEventListener("click", trackLinkClick, { capture: true });
}

// Names the clicks worth counting on their own, beyond what autocapture already records
function trackLinkClick(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest?.("a[href]");

  if (!(link instanceof HTMLAnchorElement)) {
    return;
  }

  const url = new URL(link.href, window.location.href);
  const from = window.location.pathname;
  const label = link.textContent?.trim() || undefined;

  if (url.protocol === "mailto:") {
    posthog.capture("email_clicked", { from });
  } else if (url.origin !== window.location.origin) {
    posthog.capture("outbound_link_clicked", { url: url.href, host: url.hostname, label, from });
  } else if (url.pathname === "/resume.pdf") {
    posthog.capture("resume_opened", { from });
  } else if (url.pathname.startsWith("/projects/")) {
    posthog.capture("project_opened", { slug: url.pathname.slice("/projects/".length), from });
  }
}
