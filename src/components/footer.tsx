import Link from "next/link";
import { Fragment } from "react";

import { getFriends } from "@/lib/friends";
import { Signature } from "@/components/signature";
import { getNotes } from "@/lib/notes";
import { contactLinks } from "@/lib/site";

export async function Footer() {
  const [notes, friends] = await Promise.all([getNotes(), getFriends()]);

  // The site's own pages; Notes and Friends only once they have something on them
  const pages = [
    { label: "Now", href: "/now" },
    { label: "Things", href: "/things" },
    notes.length > 0 ? { label: "Notes", href: "/notes" } : null,
    friends.length > 0 ? { label: "Friends", href: "/friends" } : null,
  ].filter((page) => page !== null);

  return (
    <footer className="footer">
      <div>
        <p>
          {contactLinks.map((link, index) => (
            <Fragment key={link.label}>
              {index > 0 ? " / " : null}
              <a href={link.href}>{link.label}</a>
            </Fragment>
          ))}
        </p>
        <nav className="footer__pages" aria-label="More pages">
          <p>
            {pages.map((page, index) => (
              <Fragment key={page.href}>
                {index > 0 ? " / " : null}
                <Link href={page.href}>{page.label}</Link>
              </Fragment>
            ))}
          </p>
        </nav>
      </div>

      <div className="footer__signoff">
        <Signature />
        <p className="footer__motto" lang="la">
          Audentes fortuna iuvat
        </p>
      </div>
    </footer>
  );
}
