"use client";

import { useEffect, useRef } from "react";

// The signature in the footer. If it is below the fold when the page opens, it is written out
// the first time it scrolls into view; if it is already on screen, it is left as it is.
export function Signature() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const signature = ref.current;
    // Watch the block around it: the signature itself is clipped away until it is written
    const signoff = signature?.parentElement;

    if (
      !signature ||
      !signoff ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      signature.getBoundingClientRect().top < window.innerHeight
    ) {
      return;
    }

    signature.dataset.sign = "pending";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          signature.dataset.sign = "signed";
          observer.disconnect();
        }
      },
      { threshold: 0.8 },
    );

    observer.observe(signoff);

    return () => {
      observer.disconnect();
      delete signature.dataset.sign;
    };
  }, []);

  // Drawn through a mask, so the signature takes the same ink as the coffee stamp
  return (
    <span ref={ref} className="footer__signature" role="img" aria-label="Kevin Lin's signature" />
  );
}
