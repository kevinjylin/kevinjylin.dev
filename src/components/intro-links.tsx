import { existsSync } from "node:fs";
import path from "node:path";

import Link from "next/link";
import { Fragment } from "react";

import { getNotes } from "@/lib/notes";
import { contactLinks } from "@/lib/site";

// Email / GitHub / LinkedIn / Resume / Notes, set under the name at the top of every page
export async function IntroLinks() {
  // The Resume link appears once public/resume.pdf exists, so it never points at a 404
  const hasResume = existsSync(path.join(process.cwd(), "public", "resume.pdf"));
  // Notes appears once there's a note, like in the footer
  const notes = await getNotes();

  return (
    <nav className="intro-links" aria-label="Intro links">
      {contactLinks.map((link, index) => (
        <Fragment key={link.label}>
          {index > 0 ? <span> / </span> : null}
          {link.href.startsWith("mailto:") ? (
            <a href={link.href}>{link.label}</a>
          ) : (
            <a href={link.href} rel="noreferrer" target="_blank">
              {link.label}
            </a>
          )}
        </Fragment>
      ))}
      {hasResume ? (
        <>
          <span> / </span>
          <a href="/resume.pdf" rel="noreferrer" target="_blank">
            Resume
          </a>
        </>
      ) : null}
      {notes.length > 0 ? (
        <>
          <span> / </span>
          <Link href="/notes">Notes</Link>
        </>
      ) : null}
    </nav>
  );
}
