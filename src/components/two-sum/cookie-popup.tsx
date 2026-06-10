"use client";

import Image from "next/image";
import { COOKIE_BITE_TOTAL, getNextCookieBiteCount } from "@/lib/two-sum-submission";

type CookiePopupProps = {
  bites: number;
  onBite: (nextBites: number) => void;
  onDismiss: () => void;
};

export function CookiePopup({ bites, onBite, onDismiss }: CookiePopupProps) {
  const bitesLeft = COOKIE_BITE_TOTAL - bites;

  return (
    <div className="cookie-popup" role="dialog" aria-label="You earned a cookie">
      <button type="button" className="cookie-popup__close" onClick={onDismiss} aria-label="Close">
        ×
      </button>
      <p className="cookie-popup__eyebrow">surprise!</p>
      <h2 className="cookie-popup__title">here&apos;s a cookie 🍪</h2>
      <button
        type="button"
        className={`cookie-button cookie-button--bites-${bites}`}
        onClick={() => onBite(getNextCookieBiteCount(bites))}
        disabled={bites === COOKIE_BITE_TOTAL}
        aria-label={
          bitesLeft > 0 ? `Eat the cookie. ${bitesLeft} bites left.` : "Cookie fully eaten."
        }
      >
        <Image
          src={`/cookie/cookie-${bites}.png`}
          alt="Cookie"
          width={200}
          height={200}
          className="cookie-image"
          unoptimized
        />
      </button>
      <p className="cookie-popup__note">
        {bitesLeft > 0
          ? `click the cookie ${bitesLeft} more ${bitesLeft === 1 ? "time" : "times"}.`
          : "nom nom. delicious."}
      </p>
    </div>
  );
}
