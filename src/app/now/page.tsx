import type { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";

import { AgentGraphIcon } from "@/components/agent-graph-icon";
import { mdxComponents } from "@/components/mdx-components";
import { Footer } from "@/components/footer";
import { getNow } from "@/lib/now";

export const metadata: Metadata = {
  title: "Now — Kevin Lin",
  description: "What Kevin Lin is focused on right now.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatLastUpdated(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateFormatter.format(parsed);
}

export default async function NowPage() {
  const { lastUpdated, content } = await getNow();

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      <div className="page-frame">
        <div className="intro-offset">
          <Link href="/" className="site-icon" aria-label="Back home">
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
          </section>

          <article className="now-page">
            <header className="now-page__header">
              <p className="now-page__updated">
                Last updated <time dateTime={lastUpdated}>{formatLastUpdated(lastUpdated)}</time>
              </p>
            </header>

            <div className="project-detail__body now-page__body">
              <MDXRemote source={content} components={mdxComponents} />
            </div>
          </article>
        </div>

        <Footer />
      </div>
    </main>
  );
}
