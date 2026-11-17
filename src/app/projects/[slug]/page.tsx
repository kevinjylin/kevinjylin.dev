import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Fragment } from "react";

import { Footer } from "@/components/footer";
import { mdxComponents } from "@/components/mdx-components";
import { Picture } from "@/components/picture";
import { getLiveLabel } from "@/components/project-links";
import { inListOrder } from "@/lib/project-order";
import { getProjectBySlug, getProjects } from "@/lib/projects";
import { formatMonth } from "@/lib/utils";

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

  const title = `${project.metadata.title} — Kevin Lin`;

  return {
    title,
    description: project.metadata.summary,
    openGraph: {
      type: "article",
      siteName: "Kevin Lin",
      title,
      description: project.metadata.summary,
      url: `/projects/${slug}`,
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const [project, projects] = await Promise.all([getProjectBySlug(slug), getProjects()]);

  if (!project) {
    notFound();
  }

  const { metadata, content } = project;
  const hasBody = content.trim().length > 0;

  const links = [
    metadata.repoUrl ? { label: "Repository", href: metadata.repoUrl } : null,
    metadata.liveUrl ? { label: getLiveLabel(metadata.liveUrl), href: metadata.liveUrl } : null,
  ].filter((link) => link !== null);

  // The projects either side of this one, in the order the home page lists them
  const listed = inListOrder(projects);
  const position = listed.findIndex((entry) => entry.slug === slug);
  const previous = listed[position - 1];
  const next = listed[position + 1];

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      <div className="page-frame">
        <div className="intro-offset">
          <Link href="/" className="project-back" aria-label="Back to home">
            ← Back
          </Link>

          <article className="project-detail">
            <header className="project-detail__header project-detail__header--project">
              <h1>{metadata.title}</h1>
              <p className="project-detail__summary">{metadata.summary}</p>
              {metadata.why ? <p className="project-detail__why">{metadata.why}</p> : null}
            </header>

            {/* Set with `cover` in the project's file; the page reads fine without one */}
            {metadata.cover ? (
              <p className="project-detail__cover">
                <Picture
                  src={metadata.cover}
                  alt={metadata.coverAlt ?? `${metadata.title}, as it looks in use`}
                  caption={metadata.coverCaption}
                  lead
                />
              </p>
            ) : null}

            {/* The facts, set like the shelf on /things: a muted label, then what it is */}
            <dl className="project-facts">
              <div>
                <dt>When</dt>
                <dd>
                  <time dateTime={metadata.date}>
                    {formatMonth(metadata.date, { month: "long", year: "numeric" })}
                  </time>
                </dd>
              </div>

              {metadata.event || metadata.award ? (
                <div>
                  <dt>For</dt>
                  <dd>
                    {metadata.event}
                    {metadata.event && metadata.award ? " — " : null}
                    {metadata.award ? <strong>{metadata.award}</strong> : null}
                  </dd>
                </div>
              ) : null}

              {metadata.kind ? (
                <div>
                  <dt>Kind</dt>
                  <dd>{metadata.kind}</dd>
                </div>
              ) : null}

              {metadata.tags.length > 0 ? (
                <div>
                  <dt>Built with</dt>
                  <dd>{metadata.tags.join(" / ")}</dd>
                </div>
              ) : null}

              {links.length > 0 ? (
                <div>
                  <dt>Links</dt>
                  <dd>
                    {links.map((link, index) => (
                      <Fragment key={link.href}>
                        {index > 0 ? " / " : null}
                        <a href={link.href} rel="noreferrer" target="_blank">
                          {link.label}
                        </a>
                      </Fragment>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            {hasBody ? (
              <div className="project-detail__body">
                <MDXRemote source={content} components={mdxComponents} />
              </div>
            ) : null}
          </article>

          {previous || next ? (
            <nav className="project-turn" aria-label="More projects">
              {previous ? (
                <p className="project-turn__previous">
                  <span>Previous</span>
                  <Link href={`/projects/${previous.slug}`}>← {previous.title}</Link>
                </p>
              ) : null}
              {next ? (
                <p className="project-turn__next">
                  <span>Next</span>
                  <Link href={`/projects/${next.slug}`}>{next.title} →</Link>
                </p>
              ) : null}
            </nav>
          ) : null}
        </div>

        <Footer />
      </div>
    </main>
  );
}
