"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import "./site-mark.css";

type SiteMarkProps = {
  href: string;
  label: string;
};

type Rgb = [number, number, number];

type Node = {
  // Home position; the node drifts and springs around it
  hx: number;
  hy: number;
  r: number;
  // Depth for parallax while the frame tilts: positive is nearer the viewer
  z: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Lights up when a signal arrives, then fades
  glow: number;
};

type Signal = { from: number; to: number; t: number; hops: number };

type Ripple = { node: number; t: number };

type Spring = { v: number; vel: number };

// The layout lives in a 64×64 space and is scaled to whatever size the frame renders at
const UNITS = 64;
const CENTER = UNITS / 2;
// How far past the frame's edge (CSS px) the cursor is still noticed
const REACH = 150;
const MAX_HOPS = 3;
const TAU = Math.PI * 2;

const NODES = [
  { x: 30, y: 33.5, r: 4.1, z: 0.9 },
  { x: 14, y: 21.5, r: 2.9, z: -0.4 },
  { x: 35, y: 13, r: 2.5, z: 0.3 },
  { x: 50.5, y: 25.5, r: 3, z: -0.7 },
  { x: 17, y: 48, r: 2.7, z: 0.5 },
  { x: 44, y: 50.5, r: 3.1, z: -0.2 },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 2],
  [3, 5],
  [4, 5],
];

const NEIGHBORS: number[][] = NODES.map(() => []);
const EDGE_INDEX = new Map<string, number>();

EDGES.forEach(([a, b], index) => {
  NEIGHBORS[a].push(b);
  NEIGHBORS[b].push(a);
  EDGE_INDEX.set(`${a}-${b}`, index);
  EDGE_INDEX.set(`${b}-${a}`, index);
});

function edgeIndex(a: number, b: number) {
  return EDGE_INDEX.get(`${a}-${b}`) ?? 0;
}

function parseHex(value: string, fallback: Rgb): Rgb {
  const hex = value.trim().replace("#", "");

  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }

  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  return fallback;
}

function rgba([r, g, b]: Rgb, alpha: number) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

// Nudges a value toward its target with a damped spring; dt is in seconds
function spring(state: Spring, target: number, dt: number, stiffness: number, damping: number) {
  state.vel += (stiffness * (target - state.v) - damping * state.vel) * dt;
  state.v += state.vel * dt;
}

// A slow, organic wander around a node's home, different for every node
function drift(index: number, time: number): [number, number] {
  const amp = 0.9 + (index % 3) * 0.25;
  const w1 = 0.22 + index * 0.05;
  const w2 = 0.4 + index * 0.04;

  return [
    amp * Math.sin(time * w1 + index * 1.7) + amp * 0.6 * Math.sin(time * w2 + index * 2.9),
    amp * Math.cos(time * w1 * 0.9 + index * 2.3) +
      amp * 0.6 * Math.cos(time * w2 * 1.1 + index * 0.8),
  ];
}

// A small agent network that lives in the corner of the page: nodes drift and spring,
// signals hop between them, and the whole mark leans toward the cursor as it approaches.
export function SiteMark({ href, label }: SiteMarkProps) {
  const frameRef = useRef<HTMLAnchorElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!frame || !canvas || !ctx) {
      return;
    }

    const styles = getComputedStyle(frame);
    const ink = parseHex(styles.getPropertyValue("--accent-strong"), [107, 68, 35]);
    const line = parseHex(styles.getPropertyValue("--accent"), [74, 44, 32]);
    const paper = parseHex(styles.getPropertyValue("--background"), [255, 255, 255]);

    const nodes: Node[] = NODES.map((node) => ({
      hx: node.x,
      hy: node.y,
      r: node.r,
      z: node.z,
      x: node.x,
      y: node.y,
      vx: 0,
      vy: 0,
      glow: 0,
    }));
    const edgeLit = EDGES.map(() => 0);
    let signals: Signal[] = [];
    let ripples: Ripple[] = [];

    const hover: Spring = { v: 0, vel: 0 };
    const tiltX: Spring = { v: 0, vel: 0 };
    const tiltY: Spring = { v: 0, vel: 0 };
    let hoverTarget = 0;

    const pointer = { x: 0, y: 0, known: false };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    let onScreen = true;
    let raf = 0;
    let last = 0;
    let time = 0;
    let nextSpawn = 1.2;
    let dpr = 1;
    let scale = 0;

    frame.dataset.live = "";

    const render = () => {
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.clearRect(0, 0, UNITS, UNITS);

      // Nearer nodes shift more as the frame tilts, so the mark reads as having depth
      const px = tiltX.v * 1.2;
      const py = tiltY.v * 1.2;
      const at = nodes.map((node) => ({ x: node.x + px * node.z, y: node.y + py * node.z }));

      ctx.lineCap = "round";

      EDGES.forEach(([a, b], index) => {
        const lit = edgeLit[index];

        ctx.beginPath();
        ctx.moveTo(at[a].x, at[a].y);
        ctx.lineTo(at[b].x, at[b].y);
        ctx.setLineDash([]);
        ctx.lineWidth = 0.9 + lit * 0.3;
        ctx.strokeStyle = rgba(line, 0.14 + lit * 0.22);
        ctx.stroke();

        // The flowing dots the site's other graphs share
        ctx.setLineDash([0.01, 4.4]);
        ctx.lineDashOffset = -time * 2;
        ctx.lineWidth = 1.7;
        ctx.strokeStyle = rgba(line, 0.34 + lit * 0.26);
        ctx.stroke();
      });

      ctx.setLineDash([]);

      ripples.forEach((ripple) => {
        const node = nodes[ripple.node];
        const p = at[ripple.node];
        const k = ripple.t;

        ctx.beginPath();
        ctx.arc(p.x, p.y, node.r + 1.5 + k * 6, 0, TAU);
        ctx.lineWidth = 1.1 * (1 - k) + 0.2;
        ctx.strokeStyle = rgba(ink, (1 - k) ** 1.6 * 0.28);
        ctx.stroke();
      });

      signals.forEach((signal) => {
        const a = at[signal.from];
        const b = at[signal.to];
        const head = easeInOut(clamp(signal.t, 0, 1));
        const tail = easeInOut(clamp(signal.t - 0.28, 0, 1));
        const hx = a.x + (b.x - a.x) * head;
        const hy = a.y + (b.y - a.y) * head;
        const tx = a.x + (b.x - a.x) * tail;
        const ty = a.y + (b.y - a.y) * tail;

        const gradient = ctx.createLinearGradient(tx, ty, hx, hy);
        gradient.addColorStop(0, rgba(ink, 0));
        gradient.addColorStop(1, rgba(ink, 0.55));
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = gradient;
        ctx.stroke();

        ctx.fillStyle = rgba(ink, 0.95);
        ctx.beginPath();
        ctx.arc(hx, hy, 1.5, 0, TAU);
        ctx.fill();
      });

      nodes.forEach((node, index) => {
        const p = at[index];
        const glow = node.glow;
        const radius = node.r * (1 + glow * 0.12) * (1 + hover.v * 0.03);

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, TAU);
        ctx.fillStyle = index === 0 ? rgba(ink, 1) : rgba(paper, 1);
        ctx.fill();

        if (index !== 0 && glow > 0.01) {
          ctx.fillStyle = rgba(ink, glow * 0.45);
          ctx.fill();
        }

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(ink, 0.92);
        ctx.stroke();
      });
    };

    const spawn = () => {
      const from = Math.floor(Math.random() * nodes.length);
      const to = pick(NEIGHBORS[from]);

      signals.push({ from, to, t: 0, hops: 1 });
      edgeLit[edgeIndex(from, to)] = 1;
    };

    const simulate = (dt: number) => {
      time += dt;

      // Where the cursor is in layout units, and how strongly it's felt
      let strength = 0;
      let cursorX = CENTER;
      let cursorY = CENTER;
      let leanX = 0;
      let leanY = 0;

      if (pointer.known && scale > 0) {
        const rect = frame.getBoundingClientRect();
        const mx = pointer.x - (rect.left + rect.width / 2);
        const my = pointer.y - (rect.top + rect.height / 2);
        const reach = rect.width / 2 + REACH;
        const distance = Math.hypot(mx, my);

        if (distance < reach) {
          const near = 1 - distance / reach;
          strength = near * near * (3 - 2 * near);
          cursorX = CENTER + mx / scale;
          cursorY = CENTER + my / scale;
          // Turns to face an approaching cursor, then levels out once it's over the mark
          const lean = Math.min(1, (distance / reach) * near * 4);
          leanX = (mx / (distance || 1)) * lean;
          leanY = (my / (distance || 1)) * lean;
        }
      }

      spring(hover, hoverTarget, dt, 120, 16);
      spring(tiltX, leanX, dt, 90, 14);
      spring(tiltY, leanY, dt, 90, 14);

      // The network opens up a touch while hovered
      const spread = 1 + hover.v * 0.04;

      nodes.forEach((node, index) => {
        const [dx, dy] = drift(index, time);
        let gx = CENTER + (node.hx + dx - CENTER) * spread;
        let gy = CENTER + (node.hy + dy - CENTER) * spread;

        // Every node leans toward the cursor; the nearest ones all but reach it
        if (strength > 0) {
          const px = cursorX - gx;
          const py = cursorY - gy;
          const pd = Math.hypot(px, py) || 1;
          const pull = (Math.min(pd, 3) * strength * 0.6) / pd;

          gx += px * pull;
          gy += py * pull;
        }

        node.vx += (70 * (gx - node.x) - 10 * node.vx) * dt;
        node.vy += (70 * (gy - node.y) - 10 * node.vy) * dt;
        node.x += node.vx * dt;
        node.y += node.vy * dt;
        node.glow *= Math.exp(-dt * 3.5);
      });

      edgeLit.forEach((lit, index) => {
        edgeLit[index] = lit * Math.exp(-dt * 2.4);
      });

      // Now and then a signal hops between nodes, a little more often while hovered
      const pace = 1 + hover.v * 0.6;

      if (time >= nextSpawn) {
        spawn();
        nextSpawn = time + random(2.2, 3.8) / pace;
      }

      signals = signals.filter((signal) => {
        signal.t += (dt * pace) / 0.8;

        while (signal.t >= 1) {
          nodes[signal.to].glow = 1;
          ripples.push({ node: signal.to, t: 0 });

          const onward = NEIGHBORS[signal.to].filter((next) => next !== signal.from);

          if (signal.hops >= MAX_HOPS || onward.length === 0 || Math.random() > 0.55) {
            return false;
          }

          signal.from = signal.to;
          signal.to = pick(onward);
          signal.t -= 1;
          signal.hops += 1;
          edgeLit[edgeIndex(signal.from, signal.to)] = 1;
        }

        return true;
      });

      ripples = ripples.filter((ripple) => {
        ripple.t += dt / 0.6;
        return ripple.t < 1;
      });

      const rx = (-tiltY.v * 5).toFixed(2);
      const ry = (tiltX.v * 5).toFixed(2);
      const lift = (-hover.v * 1).toFixed(2);
      frame.style.transform = `perspective(280px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(${lift}px)`;
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      simulate(dt);
      render();
    };

    // Back to the resting pose, for a single static frame
    const rest = () => {
      nodes.forEach((node) => {
        node.x = node.hx;
        node.y = node.hy;
        node.vx = 0;
        node.vy = 0;
        node.glow = 0;
      });
      edgeLit.fill(0);
      signals = [];
      ripples = [];
      hover.v = hover.vel = 0;
      tiltX.v = tiltX.vel = 0;
      tiltY.v = tiltY.vel = 0;
      frame.style.transform = "";
    };

    const sync = () => {
      const shouldRun = onScreen && !document.hidden && !reduced;

      if (shouldRun && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      } else if (!shouldRun && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      scale = Math.min(width, height) / UNITS;

      if (!raf) {
        render();
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.known = true;
    };

    // The cursor left the window, so stop leaning after it
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        pointer.known = false;
      }
    };

    const onEnter = () => {
      hoverTarget = 1;
      nextSpawn = Math.min(nextSpawn, time + 0.1);
    };

    const onLeave = () => {
      if (!frame.matches(":focus-visible")) {
        hoverTarget = 0;
      }
    };

    const onFocus = () => {
      if (frame.matches(":focus-visible")) {
        onEnter();
      }
    };

    const onBlur = () => {
      if (!frame.matches(":hover")) {
        hoverTarget = 0;
      }
    };

    const onMotion = (event: MediaQueryListEvent) => {
      reduced = event.matches;
      sync();

      if (reduced) {
        rest();
        render();
      }
    };

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    const sizer = new ResizeObserver(resize);

    resize();

    if (reduced) {
      rest();
      render();
    }

    sync();
    visibility.observe(frame);
    sizer.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onOut);
    frame.addEventListener("pointerenter", onEnter);
    frame.addEventListener("pointerleave", onLeave);
    frame.addEventListener("focus", onFocus);
    frame.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", onMotion);

    return () => {
      cancelAnimationFrame(raf);
      visibility.disconnect();
      sizer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      frame.removeEventListener("pointerenter", onEnter);
      frame.removeEventListener("pointerleave", onLeave);
      frame.removeEventListener("focus", onFocus);
      frame.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <Link href={href} aria-label={label} className="site-mark" ref={frameRef}>
      {/* Resting pose, shown until the canvas takes over */}
      <svg
        className="site-mark__static"
        viewBox={`0 0 ${UNITS} ${UNITS}`}
        aria-hidden="true"
        focusable="false"
      >
        {EDGES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            className="site-mark__static-link"
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
          />
        ))}
        {NODES.map((node, index) => (
          <circle
            key={index}
            className={
              index === 0
                ? "site-mark__static-node site-mark__static-node--hub"
                : "site-mark__static-node"
            }
            cx={node.x}
            cy={node.y}
            r={node.r}
          />
        ))}
      </svg>
      <canvas ref={canvasRef} className="site-mark__canvas" aria-hidden="true" />
    </Link>
  );
}
