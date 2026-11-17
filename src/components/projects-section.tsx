"use client";

import { type ReactNode, useState } from "react";

import { ProjectGraph } from "@/components/project-graph/project-graph";
import { ProjectList } from "@/components/project-list";
import type { ProjectMetadata } from "@/lib/projects";
import { lastProjectsView, rememberProjectsView, type View } from "@/lib/route-memory";

// The two ways to look at the projects, each drawn with the coffee stamp's pen: a few written
// lines for the list, three joined dots for the graph. The one showing is in full ink.
const views: Array<{ id: View; label: string; icon: ReactNode }> = [
  {
    id: "list",
    label: "List",
    icon: (
      <>
        <circle className="view-toggle__ink" cx="3.5" cy="5" r="1" />
        <circle className="view-toggle__ink" cx="3.6" cy="10" r="1" />
        <circle className="view-toggle__ink" cx="3.4" cy="15" r="1" />
        <path d="M7.2 4.9 C 10 4.5, 13.6 5.4, 16.7 5" />
        <path d="M7.2 10.1 C 10.4 10.5, 13 9.6, 16.2 10" />
        <path d="M7.2 15.1 C 9.6 14.7, 12 15.3, 14 14.9" />
      </>
    ),
  },
  {
    id: "graph",
    label: "Graph",
    icon: (
      <>
        <path d="M6 13.4 C 7.4 10.9, 8.6 8.6, 9.8 6.6" />
        <path d="M11.5 6.4 C 12.6 8.2, 13.8 10, 14.9 11.7" />
        <path d="M6.8 14.7 C 9.2 14.3, 11.6 13.7, 13.8 13.2" />
        <circle className="view-toggle__ink" cx="4.9" cy="14.9" r="2.1" />
        <circle className="view-toggle__ink" cx="10.6" cy="4.9" r="2.4" />
        <circle className="view-toggle__ink" cx="15.6" cy="12.9" r="1.8" />
      </>
    ),
  },
];

type ProjectsSectionProps = {
  projects: ProjectMetadata[];
};

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  // Opens on the view last chosen, so coming back from a project's page finds it as you left it
  const [view, setView] = useState<View>(lastProjectsView);

  const choose = (next: View) => {
    rememberProjectsView(next);
    setView(next);
  };

  return (
    <section className="section projects-section" aria-labelledby="projects-heading">
      <div className="section-heading">
        <h2 id="projects-heading">Projects</h2>

        <div className="view-toggle" role="group" aria-label="Show projects as">
          {views.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-label={option.label}
              aria-pressed={view === option.id}
              title={option.label}
              onClick={() => choose(option.id)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <defs>
                  {/* The stamp's roughness, scaled down for a mark this small */}
                  <filter
                    id={`view-toggle-ink-${option.id}`}
                    x="-10%"
                    y="-10%"
                    width="120%"
                    height="120%"
                  >
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.22"
                      numOctaves="2"
                      seed="6"
                    />
                    <feDisplacementMap in="SourceGraphic" scale="0.7" />
                  </filter>
                </defs>
                <g filter={`url(#view-toggle-ink-${option.id})`}>{option.icon}</g>
              </svg>
            </button>
          ))}
        </div>
      </div>

      {view === "graph" ? (
        <ProjectGraph projects={projects} />
      ) : (
        <ProjectList projects={projects} />
      )}
    </section>
  );
}
