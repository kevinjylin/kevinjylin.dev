import Link from "next/link";

import { formatDay } from "@/lib/content-page";
import type { NoteMetadata } from "@/lib/notes";

type NoteListProps = {
  notes: NoteMetadata[];
};

// Plain rows: the date in the gutter, the title, and one line on what it's about
export function NoteList({ notes }: NoteListProps) {
  return (
    <ol className="note-list">
      {notes.map((note) => (
        <li key={note.slug} className="note-list__row">
          <time className="note-list__date" dateTime={note.date}>
            {formatDay(note.date, "short")}
          </time>
          <div>
            <Link href={`/notes/${note.slug}`} className="note-list__title">
              {note.title}
            </Link>
            {note.draft ? <span className="note-list__draft"> · draft</span> : null}
            <p className="note-list__summary">{note.summary}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
