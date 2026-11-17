"use client";

import { useEffect, useRef, useState } from "react";

// Small things for people who poke around. Nothing here is needed to use the site.

const AWAY_TITLE = "Your coffee's getting cold ☕";
const SECRET = "coffee";
const CUPS_KEY = "kl-cups";
const TOAST_MS = 2600;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

// Counts refills in this browser; storage can be blocked, so it falls back to one
function pourCup(): number {
  try {
    const cups = Number(window.localStorage.getItem(CUPS_KEY) ?? "0") + 1;
    window.localStorage.setItem(CUPS_KEY, String(cups));
    return cups;
  } catch {
    return 1;
  }
}

export function EasterEggs() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // Leave the tab and the title notices
  useEffect(() => {
    let savedTitle: string | null = null;

    const onVisibility = () => {
      if (document.hidden) {
        savedTitle = document.title;
        document.title = AWAY_TITLE;
      } else if (savedTitle !== null) {
        // Only put it back if nothing else changed the title while we were away
        if (document.title === AWAY_TITLE) {
          document.title = savedTitle;
        }
        savedTitle = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Type "coffee" anywhere for a refill
  useEffect(() => {
    let typed = "";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      typed = (typed + event.key.toLowerCase()).slice(-SECRET.length);

      if (typed !== SECRET) {
        return;
      }

      typed = "";
      const cups = pourCup();
      setToast(
        cups === 1 ? "☕ Refilled. Your first cup here." : `☕ Refilled. That's cup ${cups}.`,
      );
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  // A note for anyone who opens the console
  useEffect(() => {
    console.log(
      "%cHi, thanks for looking under the hood.%c\nThe source is at https://github.com/kevinjylin/kevinjylin.dev\nTry typing “coffee” on the page.",
      "font-weight: 600; color: #4a2c20;",
      "color: #7a6b5d;",
    );
  }, []);

  return (
    <p className={toast ? "refill-toast is-visible" : "refill-toast"} role="status">
      {toast}
    </p>
  );
}
