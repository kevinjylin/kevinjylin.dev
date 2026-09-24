"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProjectLinks } from "@/components/project-links";
import type { ProjectMetadata } from "@/lib/projects";
import { cn, formatMonth } from "@/lib/utils";

type ProjectGraphProps = {
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

type Focus = { kind: "project"; index: number } | { kind: "tag"; tag: string } | null;

// Two projects are linked when they share at least one tag.
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

// Gap between a node and the start of its title
const NODE_GAP = 20;

// Arcs bow out into the margin, further for nodes that are further apart.
function getArcPath(start: Point, end: Point) {
  const maxBulge = (start.x - 4) / 0.75;
  const bulge = Math.min(maxBulge, 10 + (end.y - start.y) * 0.3);

  return `M ${start.x} ${start.y} C ${start.x - bulge} ${start.y}, ${end.x - bulge} ${end.y}, ${end.x} ${end.y}`;
}

export function ProjectGraph({ projects }: ProjectGraphProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const titleRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const [points, setPoints] = useState<Point[] | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
  const edges = useMemo(() => getEdges(projects), [projects]);

  useEffect(() => {
    const graph = graphRef.current;
    const list = listRef.current;

    if (!graph || !list) {
      return;
    }

    // Nodes sit in the gutter left of the list, level with each title.
    const measure = () => {
      const origin = graph.getBoundingClientRect();
      const nodeX =
        list.getBoundingClientRect().left -
        origin.left +
        parseFloat(getComputedStyle(list).paddingLeft) -
        NODE_GAP;

      setPoints(
        titleRefs.current.map((title) => {
          const rect = title?.getBoundingClientRect();

          return {
            x: nodeX,
            y: rect ? rect.top + rect.height / 2 - origin.top : 0,
          };
        }),
      );
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(graph);

    return () => observer.disconnect();
  }, []);

  const isEdgeLit = (edge: Edge) => {
    if (focus?.kind === "project") {
      return edge.from === focus.index || edge.to === focus.index;
    }

    if (focus?.kind === "tag") {
      return edge.tags.includes(focus.tag);
    }

    return false;
  };

  const litEdges = edges.filter(isEdgeLit);

  const isProjectLit = (index: number) => {
    if (focus?.kind === "project") {
      return (
        focus.index === index || litEdges.some((edge) => edge.from === index || edge.to === index)
      );
    }

    if (focus?.kind === "tag") {
      return projects[index].tags.includes(focus.tag);
    }

    return false;
  };

  const isTagLit = (index: number, tag: string) => {
    if (focus?.kind === "tag") {
      return focus.tag === tag;
    }

    return litEdges.some(
      (edge) => (edge.from === index || edge.to === index) && edge.tags.includes(tag),
    );
  };

  return (
    <div
      className={cn("project-graph", focus && "project-graph--focused")}
      ref={graphRef}
      onMouseLeave={() => setFocus(null)}
    >
      <svg className="project-graph__edges" aria-hidden="true" focusable="false">
        {points
          ? edges.map((edge) => (
              <path
                key={`${edge.from}-${edge.to}`}
                className={cn("project-graph__edge", isEdgeLit(edge) && "is-lit")}
                d={getArcPath(points[edge.from], points[edge.to])}
              />
            ))
          : null}
        {points?.map((point, index) => (
          <circle
            key={projects[index].slug}
            className={cn(
              "project-graph__node",
              isProjectLit(index) && "is-lit",
              focus?.kind === "project" && focus.index === index && "is-focused",
            )}
            cx={point.x}
            cy={point.y}
            r="5"
          />
        ))}
      </svg>

      <ol className="project-graph__list" ref={listRef}>
        {projects.map((project, index) => (
          <li
            className={cn(
              "project-entry",
              focus?.kind === "project" && focus.index === index && "is-focused",
              isProjectLit(index) && "is-lit",
            )}
            key={project.slug}
            onMouseEnter={() => setFocus({ kind: "project", index })}
            onFocus={() => setFocus({ kind: "project", index })}
            onBlur={() => setFocus(null)}
          >
            <div className="project-entry__head">
              <h3
                className="project-entry__title"
                ref={(title) => {
                  titleRefs.current[index] = title;
                }}
              >
                <Link href={`/projects/${project.slug}`} className="project-entry__title-link">
                  {project.title}
                </Link>
              </h3>

              {project.event || project.award ? (
                <span className="project-entry__note">
                  {project.event}
                  {project.award ? (
                    <>
                      {project.event ? " · " : null}
                      <strong>{project.award}</strong>
                    </>
                  ) : null}
                </span>
              ) : null}

              <time className="project-entry__date" dateTime={project.date}>
                {formatMonth(project.date, { month: "short", year: "numeric" })}
              </time>
            </div>

            <p className="project-entry__summary">{project.summary}</p>

            <div className="project-entry__meta">
              <ul className="project-entry__tags" aria-label={`${project.title} is built with`}>
                {project.tags.map((tag) => (
                  <li
                    className={cn(isTagLit(index, tag) && "is-lit")}
                    key={tag}
                    onMouseEnter={() => setFocus({ kind: "tag", tag })}
                    onMouseLeave={() => setFocus({ kind: "project", index })}
                  >
                    {tag}
                  </li>
                ))}
              </ul>

              <ProjectLinks
                className="project-links project-entry__links"
                repoUrl={project.repoUrl}
                liveUrl={project.liveUrl}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
