import Link from "next/link";

import "./coffee-mark.css";

type CoffeeMarkProps = {
  href: string;
  label: string;
};

// A stamp in the corner of the page: a cup of coffee and my initials, drawn in the same
// ink as the links. The steam drifts up on a slow loop and quickens on hover.
export function CoffeeMark({ href, label }: CoffeeMarkProps) {
  return (
    <Link href={href} aria-label={label} className="coffee-mark">
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          {/* Roughens every stroke a little, so the lines read as ink, not vectors */}
          <filter id="coffee-mark-ink" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="1.3" />
          </filter>
        </defs>

        <g className="coffee-mark__ink" filter="url(#coffee-mark-ink)">
          {/* A loose square; the stroke overshoots where it starts and ends, like a pen */}
          <path
            className="coffee-mark__frame"
            d="M7 4.6 C 22 3.9, 43 4.5, 59.2 4.3 C 59.9 20, 59.4 43, 59.7 59.4 C 44 60.1, 21 59.6, 4.6 59.8 C 4.1 44, 4.6 21, 4.9 6.8"
          />

          <path className="coffee-mark__line" d="M41.5 9 C 41.2 25, 41.7 40, 41.3 55.5" />

          {/* Steam, three wisps rising from the cup */}
          <path className="coffee-mark__steam coffee-mark__steam--1" pathLength={1} d="M17.5 29 C 14.8 25.5, 20.4 22.6, 17.8 18.6 C 15.9 15.8, 18.6 13.4, 17.6 11" />
          <path className="coffee-mark__steam coffee-mark__steam--2" pathLength={1} d="M23.4 28 C 20.9 24, 26.6 21.1, 23.8 16.4 C 22 13.4, 24.6 11.2, 23.6 8.6" />
          <path className="coffee-mark__steam coffee-mark__steam--3" pathLength={1} d="M29.2 29 C 26.8 25.6, 31.9 22.8, 29.4 18.9 C 27.8 16.4, 30.1 14.2, 29.2 12.2" />

          {/* The cup, its handle, and the saucer */}
          <path className="coffee-mark__line" d="M10.8 32.8 C 18 33.3, 27 33.1, 35.2 32.7" />
          <path className="coffee-mark__line" d="M11.6 33 L 13.4 48.6 C 13.9 52, 15.6 53.2, 18.4 53.2 L 28 53.2 C 30.9 53.2, 32.5 51.8, 33 48.6 L 34.6 33" />
          <path className="coffee-mark__line" d="M34.2 37.2 C 39.6 36.4, 40.2 45.6, 32.9 46.2" />
          <path className="coffee-mark__line" d="M7.6 55.6 C 15 57.6, 31 57.5, 38.6 55.4" />

          {/* K over L, lettered with the same pen */}
          <path className="coffee-mark__line" d="M47.4 12.4 L 47.2 27.4 M 55.6 12.6 L 47.6 20.6 M 50.2 18.4 L 56 27.2" />
          <path className="coffee-mark__line" d="M47.6 35 L 47.2 50 C 50 49.8, 53 49.9, 56.2 49.6" />
        </g>
      </svg>
    </Link>
  );
}
