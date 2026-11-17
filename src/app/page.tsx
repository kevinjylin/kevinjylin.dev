import Link from "next/link";
import { Fragment } from "react";

import { CoffeeMark } from "@/components/coffee-mark";
import { Footer } from "@/components/footer";
import { GitHubActivity } from "@/components/github-activity";
import { IntroLinks } from "@/components/intro-links";
import { NoteList } from "@/components/note-list";
import { ProjectsSection } from "@/components/projects-section";
import { getGitHubActivity } from "@/lib/github-activity";
import { getNotes } from "@/lib/notes";
import { getProjects } from "@/lib/projects";

export default async function Home() {
  const [projects, activity, notes] = await Promise.all([
    getProjects(),
    getGitHubActivity("kevinjylin"),
    getNotes(),
  ]);

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      {/* The home page sets itself down once when it opens: see "Entrance" in globals.css */}
      <div className="page-frame page-frame--enter">
        <div className="intro-offset">
          <CoffeeMark href="/two-sum" label="Solve Two Sum" />

          <section className="intro">
            <h1>Kevin Lin</h1>
            <IntroLinks />

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
          </section>
        </div>

        <ProjectsSection projects={projects} />

        {/* Left out until there's a note to show */}
        {notes.length > 0 ? (
          <section className="section" aria-labelledby="notes-heading">
            <div className="section-heading">
              <h2 id="notes-heading">Notes</h2>
              {notes.length > 3 ? (
                <p>
                  <Link href="/notes" className="section-heading__link">
                    All notes →
                  </Link>
                </p>
              ) : null}
            </div>

            <NoteList notes={notes.slice(0, 3)} />
          </section>
        ) : null}

        {/* Fetched on the server so the HTML has real numbers; left out when GitHub has none */}
        {activity ? (
          <section className="section activity-section" aria-labelledby="activity-heading">
            <div className="section-heading">
              <h2 id="activity-heading">Activity</h2>
              <p>{activity.total.toLocaleString("en-US")} contributions in the last year</p>
            </div>

            {/* Just the grid: the count sits in the heading and the repos in a line below */}
            <GitHubActivity
              className="ga--plain"
              contributions={activity.contributions}
              // Small enough that the whole year still fits the page's column
              cellSize={9}
              showMonths
            />

            {activity.repos.length > 0 ? (
              <p className="activity-repos">
                Most active in{" "}
                {activity.repos.map((repo, index) => (
                  <Fragment key={repo.name}>
                    {index > 0 ? " / " : null}
                    {repo.href ? (
                      <a href={repo.href} rel="noreferrer" target="_blank">
                        {repo.name}
                      </a>
                    ) : (
                      repo.name
                    )}
                  </Fragment>
                ))}
              </p>
            ) : null}
          </section>
        ) : null}
        <Footer />
      </div>
    </main>
  );
}
