"use client";

import { useState } from "react";

import { ProjectGraph } from "@/components/project-graph/project-graph";
import { ProjectList } from "@/components/project-list";
import type { ProjectMetadata } from "@/lib/projects";

type View = "graph" | "list";

const views: Array<{ id: View; label: string }> = [
  { id: "graph", label: "Graph" },
  { id: "list", label: "List" },
];

type ProjectsSectionProps = {
  projects: ProjectMetadata[];
};

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  const [view, setView] = useState<View>("graph");

  return (
    <section className="section projects-section" aria-labelledby="projects-heading">
      <div className="section-heading">
        <h2 id="projects-heading">Projects</h2>

        <div className="view-toggle" role="group" aria-label="Show projects as">
          {views.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              onClick={() => setView(option.id)}
            >
              {option.label}
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
