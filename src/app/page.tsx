import Link from "next/link";
import Image from "next/image";

import { AgentGraphIcon } from "@/components/agent-graph-icon";
import { ProjectLinks } from "@/components/project-links";
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
                I&apos;m a Computer Science + Business student at <strong>UC Riverside</strong>,
                interested in AI agent systems, product development, and the process of turning
                ideas into useful tools.
              </p>
              <p>
                I&apos;m continually building, making, questioning, and learning. Feel free to
                explore my work or reach out—I&apos;d love to share what I&apos;ve been thinking
                about.
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

          <div className="projects-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.slug}>
                <div className="project-meta">
                  <span>{project.year}</span>
                </div>

                <div className="project-copy">
                  <h3>
                    <Link href={`/projects/${project.slug}`} className="project-card__title-link">
                      {project.title}
                    </Link>
                  </h3>
                  <p>{project.summary}</p>
                </div>

                <ul className="tag-list" aria-label={`${project.title} tags`}>
                  {project.tags.map((tag) => (
                    <li className="tag" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>

                <ProjectLinks repoUrl={project.repoUrl} liveUrl={project.liveUrl} />
              </article>
            ))}
          </div>
        </section>

        <footer className="footer">
          <p>
            <a href="mailto:kevinjylin@gmail.com">Email</a> •{" "}
            <a href="https://github.com/kevinjylin">GitHub</a> •{" "}
            <a href="https://www.linkedin.com/in/kevinjylin/">LinkedIn</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
