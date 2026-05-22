import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { mdxComponents } from "@/components/mdx-components";
import { getProjectBySlug, getProjects } from "@/lib/projects";

type RouteParams = { slug: string };

type ProjectPageProps = {
  params: Promise<RouteParams>;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return {};
  }

  return {
    title: `${project.metadata.title} — Kevin Lin`,
    description: project.metadata.summary,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const { metadata, content } = project;
  const hasBody = content.trim().length > 0;

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      <div className="page-frame">
        <div className="intro-offset">
          <Link href="/" className="project-back" aria-label="Back to home">
            ← Back
          </Link>

          <article className="project-detail">
            <header className="project-detail__header">
              <p className="project-detail__year">{metadata.year}</p>
              <h1>{metadata.title}</h1>
              <p className="project-detail__summary">{metadata.summary}</p>

              <ul className="tag-list" aria-label={`${metadata.title} tags`}>
                {metadata.tags.map((tag) => (
                  <li className="tag" key={tag}>
                    {tag}
                  </li>
                ))}
              </ul>

              {(metadata.repoUrl || metadata.liveUrl) && (
                <div className="project-links project-detail__links">
                  {metadata.repoUrl ? (
                    <a href={metadata.repoUrl} rel="noreferrer" target="_blank">
                      Repository
                    </a>
                  ) : null}

                  {metadata.liveUrl ? (
                    <a href={metadata.liveUrl} rel="noreferrer" target="_blank">
                      Live Site
                    </a>
                  ) : null}
                </div>
              )}
            </header>

            {hasBody ? (
              <div className="project-detail__body">
                <MDXRemote source={content} components={mdxComponents} />
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </main>
  );
}
