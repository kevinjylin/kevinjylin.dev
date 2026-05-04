import { getProjects } from "@/lib/projects";

export default async function Home() {
  const projects = await getProjects();

  return (
    <main className="page-shell">
      <div className="page-frame">
        <section className="intro">
          <h1>Kevin Lin</h1>
          <nav className="intro-links" aria-label="Intro links">
            <a href="mailto:kevinjylin@gmail.com">Email</a>
            <span>/</span>
            <a href="https://github.com/kevinjylin" rel="noreferrer" target="_blank">
              GitHub
            </a>
            <span>/</span>
            <a href="https://www.linkedin.com/in/kevinjylin/" rel="noreferrer" target="_blank">
              LinkedIn
            </a>
          </nav>

          <div className="intro-copy">
            <p>
              I&apos;m a CS + Business student at <strong>UC Riverside</strong>, focused on
              AI agent systems and product development.
            </p>
            <p>
              I like turning rough ideas into shipped tools, especially when they involve
              workflow automation, campus communities, or developer-facing products.
            </p>
          </div>

          <ul className="intro-focus" aria-label="Current focus areas">
            <li>AI agents</li>
            <li>Product engineering</li>
            <li>Campus tools</li>
          </ul>
        </section>

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
                  {project.featured ? <span>Featured</span> : <span>Archive</span>}
                </div>

                <div className="project-copy">
                  <h3>{project.title}</h3>
                  <p>{project.summary}</p>
                </div>

                <ul className="tag-list" aria-label={`${project.title} tags`}>
                  {project.tags.map((tag) => (
                    <li className="tag" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>

                {(project.repoUrl || project.liveUrl) && (
                  <div className="project-links">
                    {project.repoUrl ? (
                      <a href={project.repoUrl} rel="noreferrer" target="_blank">
                        Repository
                      </a>
                    ) : null}

                    {project.liveUrl ? (
                      <a href={project.liveUrl} rel="noreferrer" target="_blank">
                        Live Site
                      </a>
                    ) : null}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <footer className="footer">
          <p>
            <a
              href="mailto:kevinjylin@gmail.com"
              style={{ textDecoration: "underline", textUnderlineOffset: "4px" }}
            >
              Email
            </a>{" "}
            •{" "}
            <a
              href="https://github.com/kevinjylin"
              style={{ textDecoration: "underline", textUnderlineOffset: "4px" }}
            >
              GitHub
            </a>{" "}
            •{" "}
            <a
              href="https://www.linkedin.com/in/kevinjylin/"
              style={{ textDecoration: "underline", textUnderlineOffset: "4px" }}
            >
              LinkedIn
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
