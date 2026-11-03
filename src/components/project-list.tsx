"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import "./project-list.css";

import { ProjectLinks } from "@/components/project-links";
import { getProjectGroup, PROJECT_GROUPS, type ProjectGroup } from "@/lib/project-graph-data";
import type { ProjectMetadata } from "@/lib/projects";
import { cn, formatMonth } from "@/lib/utils";

type ProjectListProps = {
  projects: ProjectMetadata[];
};

type Edge = {
  from: number;
  to: number;
  tags: string[];
};

type Point = {
  x: number;
  y: number;
};

type Arc = {
  key: string;
  from: number;
  to: number;
};

type Hover = { kind: "project"; index: number } | { kind: "tag"; tag: string } | null;

// Two projects are linked when they share at least one tool.
function getEdges(projects: ProjectMetadata[]): Edge[] {
  const edges: Edge[] = [];

  for (let from = 0; from < projects.length; from += 1) {
    for (let to = from + 1; to < projects.length; to += 1) {
      const tags = projects[from].tags.filter((tag) => projects[to].tags.includes(tag));

      if (tags.length > 0) {
        edges.push({ from, to, tags });
      }
    }
  }

  return edges;
}

// Nodes sit toward the right of the rail, leaving room on the left for arcs to bow
const NODE_INSET = 18;
const NODE_RADIUS = 5.5;
// How long a signal takes to travel one pixel of arc, so far-off nodes light up later
const SIGNAL_MS_PER_PX = 0.55;

// Arcs bow out into the rail, further for nodes that are further apart.
function getArcPath(start: Point, end: Point) {
  const maxBulge = Math.max(6, start.x - 8);
  const bulge = Math.min(maxBulge, 10 + Math.abs(end.y - start.y) * 0.12);

  return `M ${start.x} ${start.y} C ${start.x - bulge} ${start.y}, ${end.x - bulge} ${end.y}, ${end.x} ${end.y}`;
}

function getYearSpan(projects: ProjectMetadata[]) {
  const years = projects.map((project) => project.date.slice(0, 4)).sort();
  const first = years[0];
  const last = years[years.length - 1];

  return first === last ? first : `${first}–${last}`;
}

export function ProjectList({ projects }: ProjectListProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const [points, setPoints] = useState<Point[] | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [group, setGroup] = useState<ProjectGroup | null>(null);

  const edges = useMemo(() => getEdges(projects), [projects]);
  const toolCount = useMemo(
    () => new Set(projects.flatMap((project) => project.tags)).size,
    [projects],
  );
  const groups = useMemo(
    () =>
      PROJECT_GROUPS.map((entry) => ({
        ...entry,
        items: projects
          .map((_, index) => index)
          .filter((index) => getProjectGroup(projects[index]) === entry.id),
      })).filter((entry) => entry.items.length > 0),
    [projects],
  );

  useEffect(() => {
    const body = bodyRef.current;

    if (!body) {
      return;
    }

    // Nodes sit in the rail, level with each title.
    const measure = () => {
      const origin = body.getBoundingClientRect();
      const rail = parseFloat(getComputedStyle(body, "::before").width) || 60;
      const x = rail - NODE_INSET;

      setPoints(
        titleRefs.current.map((title) => {
          const rect = title?.getBoundingClientRect();

          return { x, y: rect ? rect.top + rect.height / 2 - origin.top : 0 };
        }),
      );
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(body);

    return () => observer.disconnect();
  }, [projects]);

  const activeIndex = hover?.kind === "project" ? hover.index : null;

  const litEdges = edges.filter((edge) => {
    if (hover?.kind === "project") {
      return edge.from === hover.index || edge.to === hover.index;
    }

    if (hover?.kind === "tag") {
      return edge.tags.includes(hover.tag);
    }

    return false;
  });

  const isProjectLit = (index: number) => {
    if (hover?.kind === "project") {
      return (
        index === hover.index || litEdges.some((edge) => edge.from === index || edge.to === index)
      );
    }

    if (hover?.kind === "tag") {
      return projects[index].tags.includes(hover.tag);
    }

    if (group) {
      return getProjectGroup(projects[index]) === group;
    }

    return false;
  };

  const isTagLit = (index: number, tag: string) => {
    if (hover?.kind === "tag") {
      return hover.tag === tag;
    }

    return litEdges.some(
      (edge) => (edge.from === index || edge.to === index) && edge.tags.includes(tag),
    );
  };

  // Hovering a project sends a signal out along each of its links; hovering a tool
  // chains together every project that uses it.
  let arcs: Arc[] = [];

  if (points) {
    if (hover?.kind === "project") {
      arcs = litEdges.map((edge) => {
        const to = edge.from === hover.index ? edge.to : edge.from;

        return { key: `${edge.from}-${edge.to}`, from: hover.index, to };
      });
    } else if (hover?.kind === "tag") {
      const chain = projects
        .map((_, index) => index)
        .filter((index) => projects[index].tags.includes(hover.tag))
        .sort((left, right) => points[left].y - points[right].y);

      arcs = chain.slice(1).map((to, step) => {
        const from = chain[step];

        return { key: `${from}-${to}`, from, to };
      });
    }
  }

  const hoverKey = hover?.kind === "project" ? `p${hover.index}` : hover ? `t${hover.tag}` : "";
  const toneOf = (index: number) => `pl-tone--${getProjectGroup(projects[index])}`;

  return (
    <div className={cn("pl", (hover || group) && "is-focused")} onMouseLeave={() => setHover(null)}>
      <div className="pl-top">
        <p className="pl-count">
          {projects.length} projects · {toolCount} tools · {getYearSpan(projects)}
        </p>

        <div className="pl-legend" role="group" aria-label="Highlight by type">
          {groups.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={cn("pl-chip", `pl-tone--${entry.id}`, group === entry.id && "is-active")}
              aria-pressed={group === entry.id}
              onClick={() => setGroup((current) => (current === entry.id ? null : entry.id))}
            >
              <span className="pl-chip__dot" aria-hidden="true" />
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pl-body" ref={bodyRef}>
        <svg className="pl-svg" aria-hidden="true" focusable="false">
          {points && points.length > 1 ? (
            <line
              className="pl-spine"
              x1={points[0].x}
              y1={points[0].y}
              x2={points[0].x}
              y2={points[points.length - 1].y}
            />
          ) : null}

          {points
            ? arcs.map((arc) => (
                <path
                  key={arc.key}
                  className={cn("pl-arc", toneOf(arc.from))}
                  d={getArcPath(points[arc.from], points[arc.to])}
                />
              ))
            : null}

          {points?.map((point, index) => {
            const project = projects[index];
            const incoming = arcs.find((arc) => arc.to === index);
            const delay = incoming
              ? Math.abs(points[incoming.from].y - point.y) * SIGNAL_MS_PER_PX
              : 0;

            return (
              <g
                key={project.slug}
                className={cn(
                  "pl-node",
                  toneOf(index),
                  isProjectLit(index) && "is-lit",
                  activeIndex === index && "is-active",
                )}
                transform={`translate(${point.x} ${point.y})`}
              >
                {incoming ? (
                  <circle
                    key={`${hoverKey}-${index}`}
                    className="pl-node__ping"
                    r={NODE_RADIUS + 2}
                    style={{ animationDelay: `${Math.round(delay)}ms` }}
                  />
                ) : null}
                {project.award ? <circle className="pl-node__award" r={NODE_RADIUS + 4} /> : null}
                <circle className="pl-node__dot" r={NODE_RADIUS} />
              </g>
            );
          })}
        </svg>

        {groups.map((entry) => (
          <section
            key={entry.id}
            className={cn("pl-group", `pl-tone--${entry.id}`)}
            aria-labelledby={`pl-group-${entry.id}`}
          >
            <h3 className="pl-group__label" id={`pl-group-${entry.id}`}>
              <span className="pl-group__dot" aria-hidden="true" />
              {entry.label} <span className="pl-group__count">{entry.items.length}</span>
            </h3>

            <ol className="pl-rows">
              {entry.items.map((index) => {
                const project = projects[index];

                return (
                  <li
                    key={project.slug}
                    className={cn(
                      "pl-row",
                      isProjectLit(index) && "is-lit",
                      activeIndex === index && "is-active",
                    )}
                    onMouseEnter={() => setHover({ kind: "project", index })}
                    onFocus={() => setHover({ kind: "project", index })}
                    onBlur={() => setHover(null)}
                  >
                    <span aria-hidden="true" />

                    <div className="pl-row__name">
                      <h4
                        className="pl-row__title"
                        ref={(title) => {
                          titleRefs.current[index] = title;
                        }}
                      >
                        <Link href={`/projects/${project.slug}`} className="pl-row__title-link">
                          {project.title}
                        </Link>
                      </h4>
                      {project.kind ? <span className="pl-row__kind">{project.kind}</span> : null}
                    </div>

                    <div className="pl-row__body">
                      <p className="pl-row__summary">{project.summary}</p>

                      {project.event || project.award ? (
                        <p className="pl-row__note">
                          {project.event}
                          {project.event && project.award ? " · " : null}
                          {project.award ? (
                            <strong className="pl-row__award">{project.award}</strong>
                          ) : null}
                        </p>
                      ) : null}

                      <ul className="pl-row__tags" aria-label={`${project.title} is built with`}>
                        {project.tags.map((tag) => (
                          <li
                            key={tag}
                            className={cn(isTagLit(index, tag) && "is-lit")}
                            onMouseEnter={() => setHover({ kind: "tag", tag })}
                            onMouseLeave={() => setHover({ kind: "project", index })}
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pl-row__aside">
                      <time className="pl-row__date" dateTime={project.date}>
                        {formatMonth(project.date, { month: "short", year: "numeric" })}
                      </time>
                      <ProjectLinks
                        className="pl-row__links"
                        repoUrl={project.repoUrl}
                        liveUrl={project.liveUrl}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
