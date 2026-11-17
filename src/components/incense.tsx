"use client";

import { useEffect, useRef, useState } from "react";

import "./incense.css";

type Puff = { x: number; y: number; vx: number; vy: number; age: number };

// The smoke's canvas: as wide as the margin allows, and tall enough for the smoke to thin out
const MAX_WIDTH = 300;
const HEIGHT = 640;
// Where the stick stands, as a share of that width, and how far up from the bottom
const FOOT_ACROSS = 0.32;
const FOOT_UP = 23;
// The stick: 116px of it, leaning five degrees
const STICK = 116;
const LEAN = (5 * Math.PI) / 180;
const SIN = Math.sin(LEAN);
const COS = Math.cos(LEAN);
// A real stick burns for half an hour; this one takes five minutes, and leaves a stub
const BURN_S = 300;
const STUB = 0.06;

// The smoke is two threads of puffs, let go thirty times a second and followed for eleven
const EMIT_S = 1 / 30;
const LIFE_S = 11;
const RISE = 32;
// It climbs straight for a moment, then the room's air starts to turn it
const CALM_S = 1.2;
const TURN_S = 4.5;
const SWIRL = 24;
const EDDY = 115;
// A pointer moving through the smoke drags it along within this many pixels
const REACH = 84;

function smooth(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function corner(x: number, y: number, z: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Smooth noise between 0 and 1, the same everywhere it is asked the same question
function noise(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;

  const near = mix(
    mix(corner(ix, iy, iz), corner(ix + 1, iy, iz), fx),
    mix(corner(ix, iy + 1, iz), corner(ix + 1, iy + 1, iz), fx),
    fy,
  );
  const far = mix(
    mix(corner(ix, iy, iz + 1), corner(ix + 1, iy, iz + 1), fx),
    mix(corner(ix, iy + 1, iz + 1), corner(ix + 1, iy + 1, iz + 1), fx),
    fy,
  );

  return mix(near, far, fz);
}

// The room's air at a point: the curl of that noise, so it swirls without bunching the smoke up
function air(x: number, y: number, z: number): [number, number] {
  const step = 0.02;
  const field = (px: number, py: number) =>
    noise(px, py, z) + 0.45 * noise(px * 2.3, py * 2.3, z * 1.7);

  return [
    (field(x, y + step) - field(x, y - step)) / (2 * step),
    -(field(x + step, y) - field(x - step, y)) / (2 * step),
  ];
}

// A stick of incense in its pumice holder, standing on the last line of the page it is listed
// on. One thread of smoke climbs straight from the ember, then wavers, folds and thins the way
// it does in a still room, and a pointer moved through it drags it along. The stick burns down
// as you read; when it is gone, the smoke clears and you can light another.
export function Incense() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stickRef = useRef<SVGLineElement>(null);
  const emberRef = useRef<SVGCircleElement>(null);
  const ashRef = useRef<SVGGElement>(null);
  // Counts sticks: lighting another starts the burn over
  const [stick, setStick] = useState(1);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 1100px)");
    const ink = window.getComputedStyle(canvas).color;
    const threads: Puff[][] = [[], []];
    const pointer = { x: -999, y: -999, vx: 0, vy: 0, at: 0 };

    let width = MAX_WIDTH;
    let burned = 0;
    let sinceEmit = 0;
    let frame = 0;
    let last = 0;
    let shown = -1;

    const tip = () => {
      const length = STICK * (1 - (1 - STUB) * Math.min(1, burned / BURN_S));
      return { x: width * FOOT_ACROSS + SIN * length, y: HEIGHT - FOOT_UP - COS * length };
    };

    const measure = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      width = canvas.clientWidth || MAX_WIDTH;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(HEIGHT * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.strokeStyle = ink;
      ctx.lineCap = "butt";
    };

    // The drawing follows the burn: the stick shortens, the ember rides its tip, ash collects
    const drawStick = () => {
      const length = STICK * (1 - (1 - STUB) * Math.min(1, burned / BURN_S));
      const lit = burned < BURN_S;
      // Half a pixel at a time, and once more when the ember goes out
      const rounded = Math.round(length * 2) / 2 + (lit ? 0 : 0.25);

      if (rounded === shown) {
        return;
      }

      shown = rounded;
      // The drawing's own coordinates: the foot of the stick is at 70, 137
      const x = (70 + SIN * length).toFixed(1);
      const y = (137 - COS * length).toFixed(1);

      stickRef.current?.setAttribute("x2", x);
      stickRef.current?.setAttribute("y2", y);
      emberRef.current?.setAttribute("cx", x);
      emberRef.current?.setAttribute("cy", y);
      emberRef.current?.setAttribute("opacity", lit ? "1" : "0");

      const fallen = Math.floor((burned / BURN_S) * 5);
      Array.from(ashRef.current?.children ?? []).forEach((speck, index) => {
        speck.setAttribute("opacity", index < fallen ? "0.5" : "0");
      });
    };

    const step = (dt: number) => {
      const lit = burned < BURN_S;

      burned += dt;

      if (lit) {
        sinceEmit += dt;

        while (sinceEmit >= EMIT_S) {
          sinceEmit -= EMIT_S;
          const from = tip();

          threads.forEach((thread) => {
            thread.push({ x: from.x, y: from.y - 2, vx: 0, vy: 0, age: 0 });
          });
        }
      }

      // The pointer's push dies away the moment it stops
      const settle = Math.exp(-8 * dt);
      pointer.vx *= settle;
      pointer.vy *= settle;

      threads.forEach((thread, index) => {
        const drag = Math.exp(-1.1 * dt);

        for (const puff of thread) {
          puff.age += dt;

          const turn = smooth((puff.age - CALM_S) / TURN_S);
          // The eddies rise with the smoke, a little slower, and the two threads feel almost the
          // same air, so they start as one line and slowly part
          const [ax, ay] = air(
            puff.x / EDDY,
            (puff.y + burned * RISE * 0.6) / EDDY,
            burned * 0.11 + index * 0.22,
          );
          const dx = puff.x - pointer.x;
          const dy = puff.y - pointer.y;
          const distance = Math.hypot(dx, dy);

          if (distance < REACH) {
            const pull = (1 - distance / REACH) ** 2 * 5 * dt;
            puff.vx += pointer.vx * pull;
            puff.vy += pointer.vy * pull;
          }

          puff.vx *= drag;
          puff.vy *= drag;
          puff.x += (ax * SWIRL * turn + 3 * turn + puff.vx) * dt;
          puff.y +=
            (-RISE * (1 - 0.25 * (puff.age / LIFE_S)) + ay * SWIRL * 0.7 * turn + puff.vy) * dt;
        }

        while (thread.length > 0 && thread[0].age > LIFE_S) {
          thread.shift();
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, HEIGHT);

      threads.forEach((thread, index) => {
        for (let at = 1; at < thread.length - 1; at += 1) {
          const before = thread[at - 1];
          const puff = thread[at];
          const after = thread[at + 1];
          const life = puff.age / LIFE_S;
          // Fades in off the ember, thins as it ages, and never reaches the canvas's edges
          const alpha =
            (index === 0 ? 0.6 : 0.34) *
            Math.min(1, puff.age / 0.4) *
            (1 - life) ** 1.5 *
            smooth(puff.x / 36) *
            smooth((width - puff.x) / 36) *
            smooth(puff.y / 60);

          if (alpha < 0.01) {
            continue;
          }

          ctx.globalAlpha = alpha;
          ctx.lineWidth = 1.1 + 1.7 * life;
          ctx.beginPath();
          ctx.moveTo((before.x + puff.x) / 2, (before.y + puff.y) / 2);
          ctx.quadraticCurveTo(puff.x, puff.y, (puff.x + after.x) / 2, (puff.y + after.y) / 2);
          ctx.stroke();
        }
      });

      drawStick();
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      step(Math.min(0.05, (now - last) / 1000));
      last = now;
      draw();

      // Burnt down and the last of the smoke gone
      if (burned >= BURN_S && threads.every((thread) => thread.length === 0)) {
        cancelAnimationFrame(frame);
        frame = 0;
        setOut(true);
      }
    };

    // Runs only while there is a margin for it to stand in
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;

      if (!wide.matches) {
        return;
      }

      measure();

      // With motion turned down, one still frame of it, like a print
      if (still.matches) {
        if (threads[0].length === 0) {
          for (let count = 0; count < 360; count += 1) {
            step(1 / 30);
          }
        }

        draw();
        return;
      }

      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const since = Math.max(0.008, (event.timeStamp - pointer.at) / 1000);

      // A pointer arriving from elsewhere has no speed yet
      if (since < 0.2) {
        pointer.vx = Math.max(-600, Math.min(600, (x - pointer.x) / since));
        pointer.vy = Math.max(-600, Math.min(600, (y - pointer.y) / since));
      }

      pointer.x = x;
      pointer.y = y;
      pointer.at = event.timeStamp;
    };

    sync();
    wide.addEventListener("change", sync);
    still.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      wide.removeEventListener("change", sync);
      still.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("pointermove", onMove);
    };
  }, [stick]);

  const relight = () => {
    setOut(false);
    setStick((count) => count + 1);
  };

  return (
    <div className={out ? "incense is-out" : "incense"}>
      <canvas ref={canvasRef} className="incense__smoke" aria-hidden="true" />

      <svg className="incense__drawing" viewBox="0 0 140 160" aria-hidden="true" focusable="false">
        <defs>
          {/* The stamp's roughness, so the holder and the cup come from one pen */}
          <filter id="incense-ink" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.5" />
          </filter>
        </defs>

        <g filter="url(#incense-ink)">
          <line ref={stickRef} className="incense__stick" x1="70" y1="137" x2="80.1" y2="21.4" />

          {/* The pumice holder: a pale, pitted stone with the stick stood in it */}
          <path
            className="incense__line incense__stone"
            d="M43.6 147.6 C 42.8 140.4, 53 135.6, 68.6 135.2 C 84.4 134.8, 97.6 139, 98 147 C 98.3 153, 86.4 156.4, 70 156.5 C 54.6 156.6, 44.2 153.8, 43.6 147.6 Z"
          />
          <path
            className="incense__pit"
            d="M54.6 145.2 l 1.4 0.3 M 80.4 142 l 1.6 -0.2 M 88.4 148.6 l 1.2 0.5 M 62.6 150.8 l 1.5 0.1 M 74.6 149 l 0.9 0.4"
          />

          <g ref={ashRef} className="incense__ash">
            <circle cx="104.6" cy="154.8" r="0.9" opacity="0" />
            <circle cx="111" cy="156" r="0.8" opacity="0" />
            <circle cx="100.4" cy="156.6" r="0.7" opacity="0" />
            <circle cx="116.4" cy="155.2" r="0.8" opacity="0" />
            <circle cx="107.6" cy="157" r="0.7" opacity="0" />
          </g>
        </g>

        <circle ref={emberRef} className="incense__ember" cx="80.1" cy="21.4" r="2.1" />
      </svg>

      <button type="button" className="incense__relight" tabIndex={out ? 0 : -1} onClick={relight}>
        Burnt out. Light another.
      </button>
    </div>
  );
}
