import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NoteList } from "@/components/note-list";
import { SubPage } from "@/components/sub-page";
import { getNotes } from "@/lib/notes";

export const metadata: Metadata = {
  title: "Notes — Kevin Lin",
  description: "Short notes from Kevin Lin on what he's building and learning.",
};

export default async function NotesPage() {
  const notes = await getNotes();

  // No page until there's something on it
  if (notes.length === 0) {
    notFound();
  }

  return (
    <SubPage>
      <section className="now-page">
        <header className="now-page__header">
          <h1>Notes</h1>
          <p className="now-page__updated">Short things I&apos;ve figured out while building.</p>
        </header>

        <NoteList notes={notes} />
      </section>
    </SubPage>
  );
}
