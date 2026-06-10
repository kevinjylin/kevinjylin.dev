import type { Metadata } from "next";
import Link from "next/link";

import { AgentGraphIcon } from "@/components/agent-graph-icon";
import { Wall } from "@/components/wall/wall";
import { getNotes } from "@/lib/wall-store";

export const metadata: Metadata = {
  title: "Wall — Kevin Lin",
  description: "Leave your mark.",
};

export const dynamic = "force-dynamic";

export default async function WallPage() {
  const notes = await getNotes();

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
              <span> / </span>
              <Link href="/wall">Wall</Link>
            </nav>
          </section>

          <section className="wall">
            <header className="now-page__header">
              <p className="now-page__updated">
                A wall for anyone passing through. Say hi, drop a thought, sign your name.
              </p>
            </header>
          </section>
        </div>
      </div>

      {/* Canvas lives outside page-frame so it spans full width */}
      <Wall initialNotes={notes} />
    </main>
  );
}
