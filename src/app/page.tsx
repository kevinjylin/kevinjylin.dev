import { getProjects } from "@/lib/projects";

const profileLinks = [
  {
    href: "https://github.com/kevinjylin",
    label: "GitHub"
  },
  {
    href: "https://github.com/kevinjylin/personal-website",
    label: "Source"
  }
] as const;

export default async function Home() {
  const projects = await getProjects();

  return (
    <main className="page-shell">
      <div className="page-frame">
        <section className="intro">
          <p className="eyebrow">kevinjylin@gmail.com</p>
          <h1>Kevin Lin</h1>
          <p className="intro-copy">
            Collection of my projects and experiences
          </p>
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
          <p>Elsewhere</p>
          <nav aria-label="External links" className="footer-links">
            {profileLinks.map((link) => (
              <a href={link.href} key={link.label} rel="noreferrer" target="_blank">
                {link.label}
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </main>
  );
}
