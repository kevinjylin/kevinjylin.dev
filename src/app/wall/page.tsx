import type { Metadata } from "next";
import Link from "next/link";

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
          <Link href="/" className="project-back" aria-label="Back to home">
            ← Back
          </Link>

          <section className="wall">
            <header className="now-page__header">
              <p className="eyebrow">/ wall</p>
              <h1>Leave your mark</h1>
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
