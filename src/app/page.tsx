import Link from "next/link";
import Image from "next/image";

import { AgentGraphIcon } from "@/components/agent-graph-icon";
import { Footer } from "@/components/footer";
import { ProjectGraph } from "@/components/project-graph";
import { getProjects } from "@/lib/projects";
import { GitHubActivity } from "@/components/github-activity";


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
              <p>Audentes fortuna iuvat</p>
            </div>
          </section>
        </div>

        <section className="section projects-section" aria-labelledby="projects-heading">
          <div className="section-heading">
            <h2 id="projects-heading">Projects</h2>
          </div>

          <ProjectGraph projects={projects} />
        </section>
        <section className="section" style={{ borderTop: "none" }} aria-labelledby="activity-heading">

          <div style={{ display: "flex", justifyContent: "center" }}>
            <GitHubActivity username="kevinjylin" showMonths />
          </div>
        </section>
        <Footer />
      </div>
    </main>
  );
}
