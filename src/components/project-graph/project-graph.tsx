"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ProjectLinks } from "@/components/project-links";
import { ForceSimulation } from "@/lib/force-simulation";
import {
  buildProjectGraph,
  highlightGroup,
  highlightNode,
  highlightSearch,
  highlightTools,
  PROJECT_GROUPS,
  type GraphNode,
  type Highlight,
  type ProjectGraphData,
  type ProjectGroup,
} from "@/lib/project-graph-data";
import type { ProjectMetadata } from "@/lib/projects";
import { cn, formatMonth } from "@/lib/utils";

import "./project-graph.css";

type Camera = { x: number; y: number; k: number };

type CardSide = "right" | "left" | "below" | "above";

// Small preference for the right, then left, so the card reads like a tooltip
const CARD_SIDES: Array<[CardSide, number]> = [
  ["right", 0],
  ["left", 6],
  ["below", 14],
  ["above", 18],
];

type Drag = {
  pointerId: number;
  // null when dragging the background to pan
  index: number | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  // Where on the node it was grabbed, so it doesn't jump to the pointer
  offsetX: number;
  offsetY: number;
  moved: boolean;
};

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.75;
const MAX_FIT_ZOOM = 1.4;
const DRAG_THRESHOLD = 4;
const COMPACT_WIDTH = 640;
const GRID_SPACING = 22;
const GOLDEN_ANGLE = 2.399963;

// Space the overlays cover, kept clear when framing the graph
const INSETS = {
  wide: { top: 58, bottom: 64, side: 24 },
  compact: { top: 84, bottom: 64, side: 16 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatShortMonth(month: string) {
  return formatMonth(month, { month: "short", year: "numeric" });
}

// Put a node that just appeared next to whatever it connects to, or start a new
// cluster beside the graph when it connects to nothing yet.
function placeNewNode(graph: ProjectGraphData, simulation: ForceSimulation, index: number) {
  const node = graph.nodes[index];
  const simNode = simulation.nodes[index];
  const anchors = node.neighbors.filter((neighbor) => simulation.nodes[neighbor].active);
  const angle = Math.random() * Math.PI * 2;
  let x = 0;
  let y = 0;
  let spread = 8;

  if (anchors.length > 0) {
    for (const anchor of anchors) {
      x += simulation.nodes[anchor].x;
      y += simulation.nodes[anchor].y;
    }

    x /= anchors.length;
    y /= anchors.length;
    spread = node.kind === "project" ? 24 : 10;
  } else {
    const active = simulation.nodes.filter((other) => other.active);

    if (active.length > 0) {
      for (const other of active) {
        x += other.x;
        y += other.y;
      }

      x /= active.length;
      y /= active.length;

      const distance = 90 + 14 * Math.sqrt(active.length);
      x += Math.cos(index * GOLDEN_ANGLE) * distance;
      y += Math.sin(index * GOLDEN_ANGLE) * distance * 0.7;
    }
  }

  simNode.x = x + Math.cos(angle) * spread;
  simNode.y = y + Math.sin(angle) * spread;
  // Tags burst out of their project
  simNode.vx = Math.cos(angle) * (node.kind === "tag" ? 5 : 1);
  simNode.vy = Math.sin(angle) * (node.kind === "tag" ? 5 : 1);
  simNode.fx = null;
  simNode.fy = null;
}

// Rough half-width of a node's label in graph units, for spacing and card placement
function labelHalfWidth(node: GraphNode) {
  return node.label.length * (node.kind === "project" ? 3.5 : 2.95);
}

// A project that shares no tools with any other project, plus its tools, forms its own
// little island. Those nodes get extra gravity so the island sits beside the main cluster.
function isIsland(graph: ProjectGraphData, node: GraphNode): boolean {
  if (node.kind === "tag") {
    return node.neighbors.length === 1 && isIsland(graph, graph.nodes[node.neighbors[0]]);
  }
  return node.neighbors.every((index) => graph.nodes[index].neighbors.length === 1);
}

function createSimulation(graph: ProjectGraphData) {
  return new ForceSimulation(
    graph.nodes.map((node) => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      active: false,
      collideRadius:
        node.kind === "project"
          ? Math.max(node.radius + 22, labelHalfWidth(node) * 0.95)
          : Math.max(node.radius + 14, labelHalfWidth(node) * 0.95 + 4),
      charge: node.kind === "project" ? -340 : node.neighbors.length > 1 ? -150 : -70,
      gravity: isIsland(graph, node) ? 2 : 1,
    })),
    graph.links.map((link) => {
      const tag = graph.nodes[link.target];
      const shared = tag.neighbors.length > 1;

      return {
        source: link.source,
        target: link.target,
        distance: shared ? 96 : 42 + graph.nodes[link.source].radius,
      };
    }),
    // Short-range repulsion keeps islands (projects that share no tools) close by
    { distanceMax: 300 },
  );
}

function getNodeIndex(target: EventTarget | null): number | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const element = target.closest("[data-node]");
  return element ? Number(element.getAttribute("data-node")) : null;
}

const groupLabels = Object.fromEntries(PROJECT_GROUPS.map((group) => [group.id, group.label]));

type GraphCardProps = {
  compact: boolean;
  graph: ProjectGraphData;
  index: number;
  onClose: () => void;
  onSelect: (index: number) => void;
  pinned: boolean;
  ref: Ref<HTMLDivElement>;
};

function GraphCard({ compact, graph, index, onClose, onSelect, pinned, ref }: GraphCardProps) {
  const node = graph.nodes[index];
  const className = cn(
    "pg-card",
    node.kind === "project" ? `pg-tone--${node.group}` : "pg-tone--tool",
    pinned && "is-pinned",
    compact && "is-docked",
  );
  const closeButton = pinned ? (
    <button type="button" className="pg-card__close" aria-label="Close preview" onClick={onClose}>
      ×
    </button>
  ) : null;

  if (node.kind === "tag") {
    const users = node.neighbors.map((neighbor) => graph.nodes[neighbor]);

    return (
      <div className={className} ref={ref}>
        {closeButton}
        <p className="pg-card__meta">
          <span className="pg-card__dot" aria-hidden="true" />
          Tool · {users.length} {users.length === 1 ? "project" : "projects"}
        </p>
        <h3 className="pg-card__title">{node.label}</h3>
        <ul className="pg-card__projects">
          {users.map((user) =>
            user.kind === "project" ? (
              <li key={user.id} className={`pg-tone--${user.group}`}>
                <span className="pg-card__dot" aria-hidden="true" />
                {pinned ? (
                  <button type="button" onClick={() => onSelect(graph.nodes.indexOf(user))}>
                    {user.label}
                  </button>
                ) : (
                  user.label
                )}
              </li>
            ) : null,
          )}
        </ul>
      </div>
    );
  }

  const { project } = node;

  return (
    <div className={className} ref={ref}>
      {closeButton}
      <p className="pg-card__meta">
        <span className="pg-card__dot" aria-hidden="true" />
        {groupLabels[node.group]} · {formatShortMonth(project.date)}
      </p>
      <h3 className="pg-card__title">{project.title}</h3>
      {project.event || project.award ? (
        <p className="pg-card__event">
          {project.event}
          {project.award ? (
            <>
              {project.event ? " · " : null}
              <strong>{project.award}</strong>
            </>
          ) : null}
        </p>
      ) : null}
      <p className="pg-card__summary">{project.summary}</p>
      <ul className="pg-card__tags" aria-label="Built with">
        {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <div className="pg-card__footer">
        {pinned ? (
          <>
            <Link href={`/projects/${project.slug}`} className="pg-card__open">
              Read more →
            </Link>
            <ProjectLinks
              className="project-links pg-card__links"
              repoUrl={project.repoUrl}
              liveUrl={project.liveUrl}
            />
          </>
        ) : (
          <span className="pg-card__hint">Click to pin · double-click to open</span>
        )}
      </div>
    </div>
  );
}

type ProjectGraphProps = {
  projects: ProjectMetadata[];
};

export function ProjectGraph({ projects }: ProjectGraphProps) {
  const router = useRouter();
  const descriptionId = useId();
  const graph = useMemo(() => buildProjectGraph(projects), [projects]);
  const { nodes, links, months } = graph;
  const lastMonth = months.length - 1;

  const [hovered, setHovered] = useState<number | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [group, setGroup] = useState<ProjectGroup | "tools" | null>(null);
  const [query, setQuery] = useState("");
  // Index into `months` of the last month shown; -1 shows nothing yet
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [compact, setCompact] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [zoomHint, setZoomHint] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<SVGGElement | null>>([]);
  const linkRefs = useRef<Array<SVGLineElement | null>>([]);
  const flowRefs = useRef<Array<SVGLineElement | null>>([]);

  const simulationRef = useRef<ForceSimulation | null>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const cameraTargetRef = useRef<Camera | null>(null);
  // Keep the whole graph framed until someone pans or zooms by hand
  const autoFitRef = useRef(true);
  const sizeRef = useRef({ width: 0, height: 0 });
  const compactRef = useRef(false);
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const cardIndexRef = useRef<number | null>(null);
  const cardSideRef = useRef<CardSide | null>(null);
  const cardPannedRef = useRef(false);
  const highlightRef = useRef<Highlight | null>(null);
  const cardSizeRef = useRef({ width: 0, height: 0 });
  const wakeRef = useRef<() => void>(() => {});
  const positionCardRef = useRef<() => void>(() => {});
  const zoomHintTimerRef = useRef<number | undefined>(undefined);

  const visibleMonth = cursor >= 0 ? months[cursor] : null;
  const isVisible = (index: number) => visibleMonth !== null && nodes[index].born <= visibleMonth;

  const focusIndex =
    [hovered, keyboardFocus, selected].find((index) => index !== null && isVisible(index)) ?? null;
  const pinned = focusIndex !== null && focusIndex === selected;

  const highlight = useMemo<Highlight | null>(() => {
    if (focusIndex !== null) {
      return highlightNode(graph, focusIndex);
    }

    if (group === "tools") {
      return highlightTools(graph);
    }

    if (group) {
      return highlightGroup(graph, group);
    }

    return highlightSearch(graph, query);
  }, [graph, focusIndex, group, query]);

  const birthsByMonth = useMemo(() => {
    const births = new Map<string, GraphNode[]>();

    for (const node of nodes) {
      if (node.kind === "project") {
        births.set(node.born, [...(births.get(node.born) ?? []), node]);
      }
    }

    return births;
  }, [nodes]);

  const groupsPresent = PROJECT_GROUPS.filter((entry) =>
    nodes.some((node) => node.kind === "project" && node.group === entry.id),
  );

  // Simulation, animation loop, camera and observers
  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    const viewport = viewportRef.current;

    if (!container || !svg || !viewport) {
      return;
    }

    const simulation = createSimulation(graph);
    simulationRef.current = simulation;

    const camera = cameraRef.current;
    const size = sizeRef.current;
    const renderX = new Float64Array(graph.nodes.length);
    const renderY = new Float64Array(graph.nodes.length);
    let frame = 0;
    let inView = false;
    let introStarted = false;
    let lastCamera = "";
    let lastTagLabel = -1;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;

    const computeFit = (): Camera => {
      const inset = compactRef.current ? INSETS.compact : INSETS.wide;
      const width = Math.max(size.width - inset.side * 2, 80);
      const height = Math.max(size.height - inset.top - inset.bottom, 80);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      simulation.nodes.forEach((simNode, index) => {
        if (!simNode.active) {
          return;
        }

        const node = graph.nodes[index];
        const { radius } = node;
        // Labels are drawn larger when zoomed out, so leave room for that too
        const halfWidth = Math.max(radius, labelHalfWidth(node) * Math.max(1, 0.85 / camera.k)) + 4;

        minX = Math.min(minX, simNode.x - halfWidth);
        maxX = Math.max(maxX, simNode.x + halfWidth);
        minY = Math.min(minY, simNode.y - radius - 8);
        maxY = Math.max(maxY, simNode.y + radius + 22);
      });

      if (minX === Infinity) {
        return { k: 1, x: size.width / 2, y: inset.top + height / 2 };
      }

      const k = clamp(
        Math.min(width / (maxX - minX), height / (maxY - minY)),
        MIN_ZOOM,
        MAX_FIT_ZOOM,
      );

      return {
        k,
        x: inset.side + width / 2 - ((minX + maxX) / 2) * k,
        y: inset.top + height / 2 - ((minY + maxY) / 2) * k,
      };
    };

    // Eases the camera toward its target; true while still moving
    const stepCamera = () => {
      const target = autoFitRef.current ? computeFit() : cameraTargetRef.current;

      if (!target) {
        return false;
      }

      const dx = target.x - camera.x;
      const dy = target.y - camera.y;
      const dk = target.k - camera.k;

      if (
        reducedMotionRef.current ||
        (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2 && Math.abs(dk) < 0.0005)
      ) {
        camera.x = target.x;
        camera.y = target.y;
        camera.k = target.k;

        if (!autoFitRef.current) {
          cameraTargetRef.current = null;
        }

        return false;
      }

      const ease = 0.1;
      camera.x += dx * ease;
      camera.y += dy * ease;
      camera.k += dk * ease;
      return true;
    };

    const applyCamera = () => {
      const key = `${camera.x.toFixed(2)},${camera.y.toFixed(2)},${camera.k.toFixed(4)}`;

      if (key === lastCamera) {
        return;
      }

      lastCamera = key;
      viewport.setAttribute(
        "transform",
        `translate(${camera.x.toFixed(2)},${camera.y.toFixed(2)}) scale(${camera.k.toFixed(4)})`,
      );

      // The dot grid moves with the camera, which makes panning feel physical
      const spacing = GRID_SPACING * camera.k * (camera.k < 0.6 ? 2 : 1);
      container.style.backgroundSize = `${spacing}px ${spacing}px`;
      container.style.backgroundPosition = `${camera.x}px ${camera.y}px`;

      // Labels never shrink below 85% of their size, so they stay readable zoomed out
      container.style.setProperty("--pg-label-scale", String(Math.max(1, 0.85 / camera.k)));

      // Tool labels fade in as you zoom, like Obsidian's text fade threshold
      const tagLabel = Math.round(clamp((camera.k - 0.62) / 0.3, 0, 1) * 20) / 20;

      if (tagLabel !== lastTagLabel) {
        lastTagLabel = tagLabel;
        container.style.setProperty("--pg-tag-label", String(tagLabel));
      }
    };

    const placeCard = (side: CardSide, index: number) => {
      const { width, height } = cardSizeRef.current;
      const node = graph.nodes[index];
      const x = renderX[index] * camera.k + camera.x;
      const y = renderY[index] * camera.k + camera.y;
      // Clear the node and the label underneath it
      const gapX = Math.max(node.radius + 8, labelHalfWidth(node) + 6) * camera.k + 12;

      switch (side) {
        case "right":
          return { left: x + gapX, top: y - 34 };
        case "left":
          return { left: x - gapX - width, top: y - 34 };
        case "below":
          return { left: x - width / 2, top: y + (node.radius + 26) * camera.k + 8 };
        case "above":
          return { left: x - width / 2, top: y - (node.radius + 10) * camera.k - 10 - height };
      }
    };

    // Pick the side where the card hides the fewest nodes, especially lit ones,
    // and doesn't run into the overlays
    const chooseCardSide = (index: number): CardSide => {
      const { width, height } = cardSizeRef.current;
      const inset = compactRef.current ? INSETS.compact : INSETS.wide;
      const lit = highlightRef.current?.nodes;
      let best: CardSide = "right";
      let bestScore = Infinity;

      for (const [side, preference] of CARD_SIDES) {
        const { left, top } = placeCard(side, index);
        const overflow =
          Math.max(0, 12 - left) +
          Math.max(0, left + width - (size.width - 12)) +
          Math.max(0, inset.top - 6 - top) +
          Math.max(0, top + height - (size.height - inset.bottom + 6));
        let score = preference + overflow * 4;

        simulation.nodes.forEach((simNode, other) => {
          if (!simNode.active || other === index) {
            return;
          }

          const x = renderX[other] * camera.k + camera.x;
          const y = renderY[other] * camera.k + camera.y;

          if (x > left - 10 && x < left + width + 10 && y > top - 10 && y < top + height + 18) {
            score += lit?.has(other) ? 120 : 20;
          }
        });

        if (score < bestScore) {
          bestScore = score;
          best = side;
        }
      }

      return best;
    };

    const positionCard = () => {
      const card = cardRef.current;
      const index = cardIndexRef.current;

      if (!card || index === null || compactRef.current) {
        return;
      }

      // Choose a side once per card so it doesn't flip around as nodes drift
      cardSideRef.current ??= chooseCardSide(index);
      const { width, height } = cardSizeRef.current;
      const position = placeCard(cardSideRef.current, index);
      const left = clamp(position.left, 12, Math.max(12, size.width - width - 12));
      const top = clamp(position.top, 12, Math.max(12, size.height - height - 12));
      card.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    };

    const render = (time: number) => {
      const reduced = reducedMotionRef.current;
      let busy = false;
      let anyActive = false;

      if (!simulation.settled) {
        simulation.tick();
        busy = true;
      }

      simulation.nodes.forEach((simNode, index) => {
        if (!simNode.active) {
          return;
        }

        anyActive = true;
        let x = simNode.x;
        let y = simNode.y;

        // A slow idle drift so the graph feels alive
        if (!reduced && simNode.fx === null) {
          const amplitude = graph.nodes[index].kind === "project" ? 1.4 : 2.2;
          const phase = index * GOLDEN_ANGLE;
          x += Math.sin(time * 0.00052 + phase) * amplitude;
          y += Math.cos(time * 0.00041 + phase * 1.7) * amplitude;
        }

        renderX[index] = x;
        renderY[index] = y;
        nodeRefs.current[index]?.setAttribute(
          "transform",
          `translate(${x.toFixed(2)},${y.toFixed(2)})`,
        );
      });

      graph.links.forEach((link, index) => {
        if (!simulation.nodes[link.source].active || !simulation.nodes[link.target].active) {
          return;
        }

        for (const line of [linkRefs.current[index], flowRefs.current[index]]) {
          line?.setAttribute("x1", renderX[link.source].toFixed(2));
          line?.setAttribute("y1", renderY[link.source].toFixed(2));
          line?.setAttribute("x2", renderX[link.target].toFixed(2));
          line?.setAttribute("y2", renderY[link.target].toFixed(2));
        }
      });

      if (stepCamera()) {
        busy = true;
      }

      applyCamera();
      positionCard();

      return busy || (!reduced && anyActive);
    };

    const loop = (time: number) => {
      frame = 0;

      if (render(time) && inView) {
        frame = requestAnimationFrame(loop);
      }
    };

    const wake = () => {
      if (!frame && inView) {
        frame = requestAnimationFrame(loop);
      }
    };

    wakeRef.current = wake;
    positionCardRef.current = positionCard;

    const onMotionChange = () => {
      reducedMotionRef.current = motionQuery.matches;
      wake();
    };
    motionQuery.addEventListener("change", onMotionChange);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;

      if (size.width === 0) {
        camera.x = width / 2;
        camera.y = height / 2;
      } else {
        camera.x += (width - size.width) / 2;
        camera.y += (height - size.height) / 2;
      }

      size.width = width;
      size.height = height;
      compactRef.current = width < COMPACT_WIDTH;
      setCompact(compactRef.current);

      // Spread the layout to match the canvas shape
      simulation.gravityX = 0.045;
      simulation.gravityY = 0.045 * clamp(width / Math.max(height, 1), 0.75, 1.9);
      simulation.reheat(0.15);
      wake();
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;

        if (inView) {
          wake();
        }

        // Grow the graph the first time it comes into view
        if (!introStarted && entry.intersectionRatio >= 0.35) {
          introStarted = true;

          if (reducedMotionRef.current) {
            setCursor(graph.months.length - 1);
          } else {
            setPlaying(true);
          }
        }
      },
      { threshold: [0, 0.35] },
    );
    intersectionObserver.observe(container);

    // Plain scrolling should still scroll the page, so zoom needs ⌘/Ctrl or a pinch
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        window.clearTimeout(zoomHintTimerRef.current);
        setZoomHint(/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl");
        zoomHintTimerRef.current = window.setTimeout(() => setZoomHint(null), 1300);
        return;
      }

      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const delta = clamp(event.deltaY * (event.deltaMode === 1 ? 16 : 1), -60, 60);
      const k = clamp(camera.k * Math.exp(-delta * 0.012), MIN_ZOOM, MAX_ZOOM);
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      autoFitRef.current = false;
      cameraTargetRef.current = null;
      camera.x = pointerX - ((pointerX - camera.x) / camera.k) * k;
      camera.y = pointerY - ((pointerY - camera.y) / camera.k) * k;
      camera.k = k;
      wake();
    };
    svg.addEventListener("wheel", onWheel, { passive: false });

    // Dragging a node on a phone shouldn't scroll the page
    const onTouchStart = (event: TouchEvent) => {
      if (getNodeIndex(event.target) !== null) {
        event.preventDefault();
      }
    };
    svg.addEventListener("touchstart", onTouchStart, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      frame = 0;
      inView = false;
      motionQuery.removeEventListener("change", onMotionChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("touchstart", onTouchStart);
      window.clearTimeout(zoomHintTimerRef.current);
      wakeRef.current = () => {};
      positionCardRef.current = () => {};
      simulationRef.current = null;
    };
  }, [graph]);

  // Show the nodes that exist by the current month, blooming new ones out of their links
  useEffect(() => {
    const simulation = simulationRef.current;

    if (!simulation) {
      return;
    }

    const month = cursor >= 0 ? months[cursor] : null;
    const arriving = new Map<string, number[]>();

    nodes.forEach((node, index) => {
      const simNode = simulation.nodes[index];
      const active = month !== null && node.born <= month;

      if (active && !simNode.active) {
        arriving.set(node.born, [...(arriving.get(node.born) ?? []), index]);
      } else {
        simNode.active = active;
      }
    });

    // Add nodes a month at a time, settling a little in between, so jumping ahead
    // lays out as cleanly as watching the timelapse
    const arrivalMonths = [...arriving.keys()].sort();

    arrivalMonths.forEach((arrivalMonth, step) => {
      for (const index of arriving.get(arrivalMonth) ?? []) {
        placeNewNode(graph, simulation, index);
        simulation.nodes[index].active = true;
      }

      if (step < arrivalMonths.length - 1) {
        simulation.reheat(0.8);
        simulation.tick(60);
      }
    });

    if (arriving.size > 0) {
      simulation.reheat(0.8);

      if (reducedMotionRef.current) {
        simulation.tick(300);
      }
    }

    wakeRef.current();
  }, [cursor, graph, months, nodes]);

  // Timelapse: linger on months where something was made, skim the quiet ones
  useEffect(() => {
    if (!playing) {
      return;
    }

    const atEnd = cursor >= lastMonth;
    const hadBirths = cursor >= 0 && birthsByMonth.has(months[cursor]);
    const delay = atEnd ? 400 : cursor < 0 ? 250 : hadBirths ? 1000 : 170;
    const timer = window.setTimeout(() => {
      if (atEnd) {
        setPlaying(false);
      } else {
        setCursor(cursor + 1);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [playing, cursor, lastMonth, months, birthsByMonth]);

  const cardIndex = focusIndex;

  // Measure the preview card whenever its content changes, then place it by its node
  useLayoutEffect(() => {
    cardIndexRef.current = cardIndex;
    cardSideRef.current = null;
    highlightRef.current = highlight;

    if (cardRef.current) {
      cardSizeRef.current = {
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
      };
    }

    // On phones the preview docks over the bottom of the canvas, so keep its node in view
    // above it, and reframe the graph once it closes
    const simNode = cardIndex === null ? null : simulationRef.current?.nodes[cardIndex];

    if (compact && simNode && cardRef.current) {
      const camera = cameraRef.current;
      const { width, height } = sizeRef.current;
      const top = INSETS.compact.top;
      const bottom = height - cardRef.current.offsetHeight - 28;
      const y = simNode.y * camera.k + camera.y;

      if (y < top || y > bottom) {
        autoFitRef.current = false;
        cardPannedRef.current = true;
        cameraTargetRef.current = {
          k: camera.k,
          x: width / 2 - simNode.x * camera.k,
          y: (top + bottom) / 2 - simNode.y * camera.k,
        };
      }
    } else if (cardIndex === null && cardPannedRef.current) {
      cardPannedRef.current = false;
      autoFitRef.current = true;
      cameraTargetRef.current = null;
    }

    positionCardRef.current();
    wakeRef.current();
  }, [cardIndex, pinned, compact, highlight]);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const camera = cameraRef.current;

    return {
      x: (clientX - (rect?.left ?? 0) - camera.x) / camera.k,
      y: (clientY - (rect?.top ?? 0) - camera.y) / camera.k,
    };
  };

  const zoomBy = (factor: number) => {
    const { width, height } = sizeRef.current;
    const from = cameraTargetRef.current ?? cameraRef.current;
    const k = clamp(from.k * factor, MIN_ZOOM, MAX_ZOOM);

    autoFitRef.current = false;
    cameraTargetRef.current = {
      k,
      x: width / 2 - ((width / 2 - from.x) / from.k) * k,
      y: height / 2 - ((height / 2 - from.y) / from.k) * k,
    };
    wakeRef.current();
  };

  const fitView = () => {
    autoFitRef.current = true;
    cameraTargetRef.current = null;
    wakeRef.current();
  };

  // Keyboard focus pans to a node that's out of frame
  const revealNode = (index: number) => {
    const simNode = simulationRef.current?.nodes[index];

    if (!simNode) {
      return;
    }

    const camera = cameraRef.current;
    const { width, height } = sizeRef.current;
    const x = simNode.x * camera.k + camera.x;
    const y = simNode.y * camera.k + camera.y;

    if (x < 60 || x > width - 60 || y < 70 || y > height - 80) {
      autoFitRef.current = false;
      cameraTargetRef.current = {
        k: camera.k,
        x: width / 2 - simNode.x * camera.k,
        y: height / 2 - simNode.y * camera.k,
      };
      wakeRef.current();
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || dragRef.current) {
      return;
    }

    suppressClickRef.current = false;
    const index = getNodeIndex(event.target);
    const simNode = index === null ? null : simulationRef.current?.nodes[index];
    const point = toWorld(event.clientX, event.clientY);

    dragRef.current = {
      pointerId: event.pointerId,
      index,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      offsetX: simNode ? simNode.x - point.x : 0,
      offsetY: simNode ? simNode.y - point.y : 0,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const simulation = simulationRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !simulation) {
      return;
    }

    if (!drag.moved) {
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);

      if (distance < DRAG_THRESHOLD) {
        return;
      }

      drag.moved = true;
      svgRef.current?.setPointerCapture(event.pointerId);
      setDragging(true);

      if (drag.index !== null) {
        setHovered(drag.index);
        simulation.alphaTarget = 0.3;
        simulation.reheat(0.3);
      } else {
        autoFitRef.current = false;
        cameraTargetRef.current = null;
      }
    }

    if (drag.index !== null) {
      const point = toWorld(event.clientX, event.clientY);
      simulation.nodes[drag.index].fx = point.x + drag.offsetX;
      simulation.nodes[drag.index].fy = point.y + drag.offsetY;
    } else {
      cameraRef.current.x += event.clientX - drag.lastX;
      cameraRef.current.y += event.clientY - drag.lastY;
    }

    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    wakeRef.current();
  };

  const handlePointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const simulation = simulationRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    if (!drag.moved) {
      // Touch taps on nodes never get a click (touchstart was cancelled to stop scrolling)
      if (event.pointerType !== "mouse" && drag.index !== null) {
        suppressClickRef.current = true;
        const index = drag.index;
        setHovered(null);
        setSelected((current) => (current === index ? null : index));
      }

      return;
    }

    suppressClickRef.current = true;
    setDragging(false);

    if (drag.index !== null && simulation) {
      // Let go and let the physics take it back, like Obsidian
      simulation.nodes[drag.index].fx = null;
      simulation.nodes[drag.index].fy = null;
      simulation.alphaTarget = 0;
    }

    setHovered(
      event.pointerType === "mouse"
        ? getNodeIndex(document.elementFromPoint(event.clientX, event.clientY))
        : null,
    );
    wakeRef.current();
  };

  const handlePointerOver = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== "mouse" || dragRef.current?.moved) {
      return;
    }

    const index = getNodeIndex(event.target);

    if (index !== null) {
      setHovered(index);
    }
  };

  const handlePointerOut = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== "mouse" || dragRef.current?.moved) {
      return;
    }

    const from = getNodeIndex(event.target);
    const to = getNodeIndex(event.relatedTarget);

    if (from !== null && from !== to) {
      setHovered(to);
    }
  };

  const handleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      return;
    }

    const index = getNodeIndex(event.target);

    if (index === null) {
      setSelected(null);
      return;
    }

    const node = nodes[index];

    if (node.kind === "project") {
      // Let the browser open new tabs and windows itself
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();

      // Enter on a focused node (detail 0) or a double-click opens the project
      if (event.detail === 0 || event.detail >= 2) {
        router.push(`/projects/${node.project.slug}`);
        return;
      }
    }

    setSelected((current) => (current === index ? null : index));
  };

  const handleSvgKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const index = getNodeIndex(event.target);

    if (index !== null && event.key === " ") {
      event.preventDefault();
      setSelected((current) => (current === index ? null : index));
    }
  };

  const handleFocus = (event: ReactFocusEvent<SVGSVGElement>) => {
    const index = getNodeIndex(event.target);

    if (index !== null && event.target.matches(":focus-visible")) {
      setKeyboardFocus(index);
      revealNode(index);
    }
  };

  const handleRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) {
      return;
    }

    if (event.key === "Escape") {
      setSelected(null);
      setGroup(null);
    } else if (event.key === "+" || event.key === "=") {
      zoomBy(1.3);
    } else if (event.key === "-") {
      zoomBy(1 / 1.3);
    } else if (event.key === "0") {
      fitView();
    }
  };

  const togglePlaying = () => {
    if (playing) {
      setPlaying(false);
      return;
    }

    if (cursor >= lastMonth) {
      setCursor(-1);
    }

    setSelected(null);
    fitView();
    setPlaying(true);
  };

  const shownMonth = months[Math.max(cursor, 0)];
  const progress = lastMonth > 0 ? Math.max(cursor, 0) / lastMonth : 1;
  const renderOrder = [
    ...nodes.flatMap((node, index) => (node.kind === "tag" ? [index] : [])),
    ...nodes.flatMap((node, index) => (node.kind === "project" ? [index] : [])),
  ];

  return (
    <div className="pg-wrap">
      <div
        className={cn(
          "pg",
          highlight && "has-highlight",
          compact && "is-compact",
          dragging && "is-dragging",
          playing && "is-playing",
          cardIndex !== null && "has-card",
        )}
        ref={containerRef}
        onKeyDown={handleRootKeyDown}
      >
        <p className="pg-watermark" aria-hidden="true">
          {shownMonth ? formatShortMonth(shownMonth) : null}
        </p>

        <svg
          className="pg-svg"
          ref={svgRef}
          aria-describedby={descriptionId}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          onKeyDown={handleSvgKeyDown}
          onFocus={handleFocus}
          onBlur={() => setKeyboardFocus(null)}
        >
          <g ref={viewportRef}>
            <g aria-hidden="true">
              {links.map((link, index) => {
                const source = nodes[link.source];
                const level = highlight?.links.get(index);
                const tone = source.kind === "project" ? `pg-tone--${source.group}` : null;
                const hidden = !isVisible(link.source) || !isVisible(link.target);

                return (
                  <g key={`${link.source}-${link.target}`} className={tone ?? undefined}>
                    <line
                      ref={(line) => {
                        linkRefs.current[index] = line;
                      }}
                      className={cn(
                        "pg-link",
                        hidden && "is-hidden",
                        level === 2 && "is-lit",
                        level === 1 && "is-soft",
                      )}
                    />
                    <line
                      ref={(line) => {
                        flowRefs.current[index] = line;
                      }}
                      className={cn("pg-flow", !hidden && level === 2 && "is-lit")}
                    />
                  </g>
                );
              })}
            </g>

            {renderOrder.map((index) => {
              const node = nodes[index];
              const visible = isVisible(index);
              const level = highlight?.nodes.get(index);
              const body = (
                <g className="pg-node__body">
                  <circle className="pg-node__hit" r={Math.max(node.radius + 7, 14)} />
                  <circle className="pg-node__halo" r={node.radius + 9} />
                  {node.kind === "project" ? (
                    <circle className="pg-node__ping" r={node.radius + 2} />
                  ) : null}
                  {node.kind === "project" && node.project.award ? (
                    <circle className="pg-node__award" r={node.radius + 4.5} />
                  ) : null}
                  <circle className="pg-node__dot" r={node.radius} />
                  <text
                    className="pg-node__label"
                    y={node.radius + (node.kind === "project" ? 17 : 13)}
                  >
                    {node.label}
                  </text>
                </g>
              );

              return (
                <g
                  key={node.id}
                  ref={(element) => {
                    nodeRefs.current[index] = element;
                  }}
                  data-node={index}
                  aria-hidden={node.kind === "tag" ? true : undefined}
                  className={cn(
                    "pg-node",
                    `pg-node--${node.kind}`,
                    node.kind === "project" ? `pg-tone--${node.group}` : "pg-tone--tool",
                    node.kind === "tag" && node.neighbors.length > 1 && "pg-node--shared",
                    !visible && "is-hidden",
                    level === 2 && "is-lit",
                    level === 1 && "is-soft",
                    index === focusIndex && "is-focus",
                    index === selected && "is-selected",
                  )}
                >
                  {node.kind === "project" ? (
                    <a
                      href={`/projects/${node.project.slug}`}
                      tabIndex={visible ? 0 : -1}
                      aria-label={`${node.project.title}: ${node.project.summary}`}
                    >
                      {body}
                    </a>
                  ) : (
                    body
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="pg-top">
          <div className="pg-legend" role="group" aria-label="Highlight by type">
            {groupsPresent.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={cn("pg-chip", `pg-tone--${entry.id}`, group === entry.id && "is-active")}
                aria-pressed={group === entry.id}
                onClick={() => {
                  setSelected(null);
                  setGroup((current) => (current === entry.id ? null : entry.id));
                }}
              >
                <span className="pg-chip__dot" aria-hidden="true" />
                {entry.label}
              </button>
            ))}
            <button
              type="button"
              className={cn("pg-chip pg-chip--key pg-tone--tool", group === "tools" && "is-active")}
              aria-pressed={group === "tools"}
              onClick={() => {
                setSelected(null);
                setGroup((current) => (current === "tools" ? null : "tools"));
              }}
            >
              <span className="pg-chip__dot" aria-hidden="true" />
              Tools
            </button>
          </div>

          <label className="pg-search">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <circle cx="7" cy="7" r="4.75" />
              <path d="M10.5 10.5 14 14" />
            </svg>
            <span className="sr-only">Search projects and tools</span>
            <input
              type="search"
              placeholder="Search"
              value={query}
              onChange={(event) => {
                setGroup(null);
                setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                }
              }}
            />
            {query ? (
              <button
                type="button"
                className="pg-search__clear"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                ×
              </button>
            ) : null}
          </label>
        </div>

        {months.length > 0 ? (
          <div className="pg-bottom">
            <div className="pg-timeline">
              <button
                type="button"
                className="pg-play"
                onClick={togglePlaying}
                aria-label={playing ? "Pause timelapse" : "Play timelapse"}
              >
                {playing ? (
                  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                    <rect x="2" y="1.5" width="2.6" height="9" rx="0.8" />
                    <rect x="7.4" y="1.5" width="2.6" height="9" rx="0.8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                    <path d="M3 1.8v8.4c0 .5.5.8.9.5l6.4-4.2a.6.6 0 0 0 0-1L3.9 1.3c-.4-.3-.9 0-.9.5Z" />
                  </svg>
                )}
              </button>
              <div className="pg-track" style={{ "--pg-progress": progress } as CSSProperties}>
                <input
                  className="pg-range"
                  type="range"
                  min={0}
                  max={lastMonth}
                  step={1}
                  value={Math.max(cursor, 0)}
                  aria-label="Timeline"
                  aria-valuetext={shownMonth ? formatShortMonth(shownMonth) : undefined}
                  onChange={(event) => {
                    setPlaying(false);
                    setCursor(Number(event.target.value));
                    fitView();
                  }}
                />
                {months.map((month, index) => {
                  const born = birthsByMonth.get(month);
                  const first = born?.[0];

                  return first && first.kind === "project" ? (
                    <span
                      key={month}
                      className={cn(
                        "pg-track__mark",
                        `pg-tone--${first.group}`,
                        index <= cursor && "is-past",
                      )}
                      style={{ "--pg-position": index / Math.max(lastMonth, 1) } as CSSProperties}
                      title={`${formatShortMonth(month)}: ${born.map((node) => node.label).join(", ")}`}
                    />
                  ) : null;
                })}
              </div>
              <output className="pg-month">{shownMonth ? formatShortMonth(shownMonth) : ""}</output>
            </div>

            <div className="pg-zoom" role="group" aria-label="Zoom">
              <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3.5 8h9" />
                </svg>
              </button>
              <button type="button" onClick={() => zoomBy(1.3)} aria-label="Zoom in">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3.5 8h9M8 3.5v9" />
                </svg>
              </button>
              <button type="button" onClick={fitView} aria-label="Fit graph to view">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        <p className={cn("pg-toast", zoomHint && "is-visible")} aria-hidden="true">
          Hold {zoomHint ?? "⌘"} and scroll to zoom
        </p>

        {cardIndex !== null ? (
          <GraphCard
            ref={cardRef}
            compact={compact}
            graph={graph}
            index={cardIndex}
            pinned={pinned}
            onClose={() => setSelected(null)}
            onSelect={(index) => {
              setHovered(null);
              setSelected(index);
            }}
          />
        ) : null}
      </div>

      <p className="pg-caption" id={descriptionId}>
        {`${graph.projectCount} projects linked by the ${graph.tagCount} tools they're built with. `}
        Drag to rearrange, hover or tap to trace links, double-click a project to open it.
      </p>
    </div>
  );
}
