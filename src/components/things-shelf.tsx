"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";

import "./things-shelf.css";

export type Thing = {
  // Names the open thing in the address, as ?thing=slug
  slug: string;
  name: string;
  brand: string;
  // A transparent cutout in public/things
  image: string;
  // Where the photo came from
  source: string;
  // A line or two about it, shown when it's open
  note?: string;
};

const PARAM = "thing";
// The one photo that grows from the shelf into the viewer, and back
const MORPH = "thing-photo";
// How far a swipe has to travel before it changes the thing
const SWIPE_PX = 40;

// Runs a change inside a view transition where the browser has them, so the photo can morph
function transition(update: () => void): Promise<void> {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!document.startViewTransition || reduced) {
    update();
    return Promise.resolve();
  }

  return document.startViewTransition(() => flushSync(update)).finished;
}

// The address is the one record of which thing is open, so a ?thing= link opens onto it
const addressListeners = new Set<() => void>();

function subscribeToAddress(listener: () => void) {
  addressListeners.add(listener);
  window.addEventListener("popstate", listener);

  return () => {
    addressListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function readAddress(): string | null {
  return new URL(window.location.href).searchParams.get(PARAM);
}

function setAddress(slug: string | null) {
  const url = new URL(window.location.href);

  if (slug) {
    url.searchParams.set(PARAM, slug);
  } else {
    url.searchParams.delete(PARAM);
  }

  window.history.replaceState(window.history.state, "", url);
  addressListeners.forEach((listener) => listener());
}

export function ThingsShelf({ things }: { things: Thing[] }) {
  const slug = useSyncExternalStore(subscribeToAddress, readAddress, () => null);
  const found = things.findIndex((thing) => thing.slug === slug);
  const open = found >= 0;
  // Where the strip waits while the viewer is closed: the last thing looked at
  const [resting, setResting] = useState(0);
  const current = open ? found : resting;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const shelfPhotos = useRef<(HTMLImageElement | null)[]>([]);
  const shelfLinks = useRef<(HTMLAnchorElement | null)[]>([]);
  const swipeStart = useRef<number | null>(null);
  // A swipe ends in a click too; this keeps that click from closing the viewer
  const swiped = useRef(false);

  // The dialog follows the address; a layout effect so it opens inside the transition's update
  useLayoutEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // The page behind stays put while the viewer is open
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const show = (index: number) => {
    const photo = shelfPhotos.current[index];

    if (photo) {
      photo.style.viewTransitionName = MORPH;
    }

    void transition(() => {
      if (photo) {
        photo.style.viewTransitionName = "";
      }

      setAddress(things[index].slug);
    });
  };

  const hide = () => {
    const photo = shelfPhotos.current[current];

    void transition(() => {
      setResting(current);
      setAddress(null);

      if (photo) {
        photo.style.viewTransitionName = MORPH;
      }
    }).then(() => {
      if (photo) {
        photo.style.viewTransitionName = "";
      }

      // Back to the thing last looked at, not the one first opened (the shelf is inert until now)
      shelfLinks.current[current]?.focus({ preventScroll: true });
    });
  };

  const go = (index: number) => {
    if (index >= 0 && index < things.length && index !== current) {
      setAddress(things[index].slug);
    }
  };

  const onShelfClick = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    // Let a new-tab click be a new tab
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    show(index);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(current - 1);
    }
  };

  const thing = things[current];

  return (
    <>
      <ul className="things-shelf">
        {things.map((item, index) => (
          <li key={item.slug}>
            <a
              ref={(node) => {
                shelfLinks.current[index] = node;
              }}
              className="things-shelf__item"
              href={`?${PARAM}=${item.slug}`}
              aria-haspopup="dialog"
              onClick={(event) => onShelfClick(event, index)}
            >
              <Image
                ref={(node) => {
                  shelfPhotos.current[index] = node;
                }}
                className="things-shelf__photo"
                src={item.image}
                alt=""
                width={900}
                height={900}
                sizes="7.5rem"
              />
              <span className="things-shelf__name">{item.name}</span>
              <span className="things-shelf__brand">{item.brand}</span>
            </a>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="thing-viewer"
        aria-label={`${thing.brand} ${thing.name}`}
        onCancel={(event) => {
          // Escape closes through the same animation as the button
          event.preventDefault();
          hide();
        }}
        onKeyDown={onKeyDown}
        onClick={(event) => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }

          // Anywhere that isn't a photo, the words or a control closes it
          const target = event.target as Element;

          if (!target.closest(".thing-viewer__slide, .thing-viewer__caption > *, button, a")) {
            hide();
          }
        }}
      >
        <div className="thing-viewer__bar">
          <button type="button" className="thing-viewer__button" onClick={hide} aria-label="Close">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 3.5 12.5 12.5 M12.5 3.5 3.5 12.5" />
            </svg>
          </button>

          <div className="thing-viewer__nav">
            <span className="thing-viewer__count">
              {current + 1} / {things.length}
            </span>
            <button
              type="button"
              className="thing-viewer__button"
              onClick={() => go(current - 1)}
              disabled={current === 0}
              aria-label="Previous thing"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M13 8H3 M7 4 3 8l4 4" />
              </svg>
            </button>
            <button
              type="button"
              className="thing-viewer__button"
              onClick={() => go(current + 1)}
              disabled={current === things.length - 1}
              aria-label="Next thing"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8h10 M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="thing-viewer__stage"
          onPointerDown={(event) => {
            swipeStart.current = event.clientX;
            swiped.current = false;
          }}
          onPointerUp={(event) => {
            if (swipeStart.current === null) {
              return;
            }

            const travelled = event.clientX - swipeStart.current;
            swipeStart.current = null;

            if (Math.abs(travelled) > SWIPE_PX) {
              swiped.current = true;
              go(current + (travelled < 0 ? 1 : -1));
            }
          }}
        >
          {/* Every thing sits on one strip; the strip slides so the current one is centred */}
          <div className="thing-viewer__strip" style={{ "--index": current } as CSSProperties}>
            {things.map((item, index) => (
              <div
                key={item.slug}
                className={
                  index === current ? "thing-viewer__slide is-current" : "thing-viewer__slide"
                }
                aria-hidden={index !== current}
                onClick={() => go(index)}
              >
                <Image
                  src={item.image}
                  alt={index === current ? `${item.brand} ${item.name}` : ""}
                  width={900}
                  height={900}
                  sizes="(max-width: 560px) 64vw, 20rem"
                  loading="eager"
                  draggable={false}
                  style={{ viewTransitionName: open && index === current ? MORPH : undefined }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="thing-viewer__caption" key={thing.slug}>
          <p className="thing-viewer__brand">{thing.brand}</p>
          <h2 className="thing-viewer__name">{thing.name}</h2>
          {thing.note ? <p className="thing-viewer__note">{thing.note}</p> : null}
          <a className="thing-viewer__source" href={thing.source} target="_blank" rel="noreferrer">
            Image source
          </a>
        </div>
      </dialog>
    </>
  );
}
