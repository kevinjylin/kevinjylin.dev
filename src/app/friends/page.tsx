import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SubPage } from "@/components/sub-page";
import { getFriends } from "@/lib/friends";

export const metadata: Metadata = {
  title: "Friends — Kevin Lin",
  description: "Personal sites of people Kevin Lin knows and builds with.",
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function FriendsPage() {
  const friends = await getFriends();

  // No page until there's someone on it
  if (friends.length === 0) {
    notFound();
  }

  return (
    <SubPage>
      <section className="now-page">
        <header className="now-page__header">
          <h1>Friends</h1>
          <p className="now-page__updated">
            People I know and build with, and the corners of the internet they keep.
          </p>
        </header>

        <ul className="note-list">
          {friends.map((friend) => (
            <li key={friend.url} className="note-list__row">
              <span className="note-list__date">{hostOf(friend.url)}</span>
              <div>
                <a href={friend.url} rel="noreferrer" target="_blank" className="note-list__title">
                  {friend.name}
                </a>
                {friend.note ? <p className="note-list__summary">{friend.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </SubPage>
  );
}
