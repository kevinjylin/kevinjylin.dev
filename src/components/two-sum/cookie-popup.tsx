"use client";

import {
  COOKIE_BITE_TOTAL,
  getNextCookieBiteCount,
} from "@/lib/two-sum-submission";

type CookiePopupProps = {
  bites: number;
  onBite: (nextBites: number) => void;
  onDismiss: () => void;
};

export function CookiePopup({ bites, onBite, onDismiss }: CookiePopupProps) {
  const bitesLeft = COOKIE_BITE_TOTAL - bites;

  return (
    <div className="cookie-popup" role="dialog" aria-label="You earned a cookie">
      <button
        type="button"
        className="cookie-popup__close"
        onClick={onDismiss}
        aria-label="Close"
      >
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
        <span className="cookie-chip cookie-chip--one" />
        <span className="cookie-chip cookie-chip--two" />
        <span className="cookie-chip cookie-chip--three" />
        <span className="cookie-chip cookie-chip--four" />
        {Array.from({ length: COOKIE_BITE_TOTAL }, (_, index) => (
          <span
            key={index}
            className={`cookie-bite cookie-bite--${index + 1}${
              bites > index ? " cookie-bite--eaten" : ""
            }`}
          />
        ))}
      </button>
      <p className="cookie-popup__note">
        {bitesLeft > 0
          ? `click the cookie ${bitesLeft} more ${bitesLeft === 1 ? "time" : "times"}.`
          : "nom nom. delicious."}
      </p>
    </div>
  );
}
