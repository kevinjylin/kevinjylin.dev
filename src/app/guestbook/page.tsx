import type { Metadata } from "next";
import Link from "next/link";

import { GuestbookForm } from "@/components/guestbook/guestbook-form";
import { getNotes } from "@/lib/guestbook-store";

export const metadata: Metadata = {
  title: "Guestbook — Kevin Lin",
  description: "Leave your mark.",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function GuestbookPage() {
  const notes = await getNotes();

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      <div className="page-frame">
        <div className="intro-offset">
          <Link href="/" className="project-back" aria-label="Back to home">
            ← Back
          </Link>

          <section className="guestbook">
            <header className="now-page__header">
              <p className="eyebrow">/ guestbook</p>
              <h1>Leave your mark</h1>
              <p className="now-page__updated">
                A wall for anyone passing through. Say hi, drop a thought, sign your name.
              </p>
            </header>

            <GuestbookForm />

            {notes.length === 0 ? (
              <p className="guestbook__empty">No notes yet — be the first to sign.</p>
            ) : (
              <ul className="guestbook__wall" aria-label="Visitor notes">
                {notes.map((note) => (
                  <li className="guestbook-note" key={note.id}>
                    <p className="guestbook-note__message">{note.message}</p>
                    <p className="guestbook-note__meta">
                      <span className="guestbook-note__name">{note.name}</span>
                      <time dateTime={new Date(note.createdAt).toISOString()}>
                        {dateFormatter.format(note.createdAt)}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
