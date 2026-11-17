import Link from "next/link";

import "./project-list.css";

import { inListOrder } from "@/lib/project-order";
import type { ProjectMetadata } from "@/lib/projects";
import { formatMonth } from "@/lib/utils";

type ProjectListProps = {
  projects: ProjectMetadata[];
};

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <ol className="pl">
      {inListOrder(projects).map((project) => (
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
          {project.why ? <p className="pl-row__why">{project.why}</p> : null}
        </li>
      ))}
    </ol>
  );
}
