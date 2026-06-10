import Link from "next/link";
import Image from "next/image";

import { AgentGraphIcon } from "@/components/agent-graph-icon";
import { ProjectLinks } from "@/components/project-links";
import { Footer } from "@/components/footer";
import { getProjects } from "@/lib/projects";

export default async function Home() {
  const projects = await getProjects();

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      <div className="page-frame">
        <div className="intro-offset">
          <Link href="/two-sum" className="site-icon" aria-label="Solve Two Sum">
            <AgentGraphIcon />
          </Link>

          <section className="intro">
            <h1>Kevin Lin</h1>
            <nav className="intro-links" aria-label="Intro links">
              <a href="mailto:kevinjylin@gmail.com">Email</a>
              <span> / </span>
              <a href="https://github.com/kevinjylin" rel="noreferrer" target="_blank">
                GitHub
              </a>
              <span> / </span>
              <a href="https://www.linkedin.com/in/kevinjylin/" rel="noreferrer" target="_blank">
                LinkedIn
              </a>
              <span> / </span>
              <Link href="/now">Now</Link>
            </nav>

            <div className="intro-copy">
              <p>
                I study Computer Science + Business at <strong>UC Riverside</strong>. The problem in
                AI I find most compelling right now isn&apos;t making agents more capable—it&apos;s
                closing the distance between what they can do and what people can actually trust
                them with. That&apos;s where I spend most of my attention, and I care about the
                engineering and the product side in equal measure.
              </p>
              <p>
                I&apos;m always reading and building toward that, and glad to{" "}
                <a href="https://www.linkedin.com/in/kevinjylin/" rel="noreferrer" target="_blank">
                  connect
                </a>{" "}
                with anyone working on similar problems.
              </p>
            </div>

            <div className="intro-signoff" aria-label="Signature">
              <Image
                src="/signature.png"
                alt="Kevin Lin signature"
                width={1310}
                height={451}
                className="intro-signature"
                priority
              />
              <p>carpe diem</p>
            </div>
          </section>
        </div>

        <section className="section" aria-labelledby="projects-heading">
          <div className="section-heading">
            <h2 id="projects-heading">Featured Projects</h2>
            <p>{projects.length} entries</p>
          </div>

          <div className="projects-list">
            {projects.map((project) => (
              <article className="project-row" key={project.slug}>
                <div className="project-row__year">{project.year}</div>

                <h3 className="project-row__title">
                  <Link href={`/projects/${project.slug}`} className="project-row__title-link">
                    {project.title}
                  </Link>
                </h3>

                <p className="project-row__summary">{project.summary}</p>

                <ul className="tag-list project-row__tags" aria-label={`${project.title} tags`}>
                  {project.tags.map((tag) => (
                    <li className="tag" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>

                <ProjectLinks
                  className="project-links project-row__links"
                  repoUrl={project.repoUrl}
                  liveUrl={project.liveUrl}
                />
              </article>
            ))}
          </div>
        </section>
        <Footer />
      </div>
    </main>
  );
}
