"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import "./project-list.css";

import { inListOrder } from "@/lib/project-order";
import type { ProjectMetadata } from "@/lib/projects";
import { lastProjectsListOpen, rememberProjectsListOpen } from "@/lib/route-memory";
import { formatMonth } from "@/lib/utils";

// How many projects show before "Show more"
const FIRST_FEW = 4;

type ProjectListProps = {
  projects: ProjectMetadata[];
};

export function ProjectList({ projects }: ProjectListProps) {
  const ordered = inListOrder(projects);
  const rest = ordered.length - FIRST_FEW;

  // Opens as it was last left, so going back from a project's page finds its row still there
  const [open, setOpen] = useState(lastProjectsListOpen);
  const rowToReach = useRef<string | null>(null);

  const toggle = () => {
    rememberProjectsListOpen(!open);
    setOpen(!open);
  };

  // A project's Back link can point at a row that is folded away. Open the list before it is
  // painted, then go to that row once it is there.
  useLayoutEffect(() => {
    const hash = window.location.hash;

    if (!hash.startsWith("#project-")) {
      return;
    }

    const slug = decodeURIComponent(hash.slice("#project-".length));

    if (ordered.findIndex((project) => project.slug === slug) >= FIRST_FEW) {
      rowToReach.current = hash.slice(1);
      rememberProjectsListOpen(true);
      setOpen(true);
    }
    // Only on arrival: the address's # is cleared once the page has used it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && rowToReach.current) {
      document.getElementById(rowToReach.current)?.scrollIntoView();
      rowToReach.current = null;
    }
  }, [open]);

  const shown = open || rest <= 0 ? ordered : ordered.slice(0, FIRST_FEW);

  return (
    <>
      <ol id="project-list" className="pl">
        {shown.map((project) => (
          <li key={project.slug} id={`project-${project.slug}`} className="pl-row">
            <div className="pl-row__head">
              <h3 className="pl-row__title">
                <Link href={`/projects/${project.slug}`} className="pl-row__title-link">
                  {project.title}
                </Link>
              </h3>

              {project.event || project.award ? (
                <p className="pl-row__note">
                  {project.award ? <strong className="pl-row__award">{project.award}</strong> : null}
                  {project.event && project.award ? " · " : null}
                  {project.event}
                </p>
              ) : null}

              <time className="pl-row__date" dateTime={project.date}>
                {formatMonth(project.date, { month: "short", year: "numeric" })}
              </time>
            </div>

            <p className="pl-row__summary">{project.summary}</p>
          </li>
        ))}
      </ol>

      {rest > 0 ? (
        <button
          type="button"
          className="pl-more"
          aria-expanded={open}
          aria-controls="project-list"
          onClick={toggle}
        >
          {open ? "Show fewer" : `Show ${rest} more`}
        </button>
      ) : null}
    </>
  );
}
