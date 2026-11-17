import type {
  Contribution,
  ContributionLevel,
  RepoContribution,
} from "@/components/github-activity";

// Refetch at most every six hours; the page is served from the cache in between
const REVALIDATE_SECONDS = 60 * 60 * 6;
const REPO_LIMIT = 3;

const CALENDAR_API = "https://github-contributions-api.jogruber.de/v4";
const GRAPHQL_API = "https://api.github.com/graphql";
const EVENTS_API = "https://api.github.com/users";

const LEVELS: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

type Day = { date: string; count: number; level: number };

export type GitHubActivityData = {
  contributions: Contribution[];
  repos: RepoContribution[];
  total: number;
};

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// With a token, ask GitHub itself. The calendar counts private work only if the
// profile's "Include private contributions" setting is on, same as the public page.
async function fetchFromGitHub(login: string): Promise<Day[] | null> {
  if (!process.env.GITHUB_TOKEN) return null;

  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
    }
  }`;

  const res = await fetch(GRAPHQL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ query, variables: { login } }),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;

  const weeks: {
    contributionDays: { date: string; contributionCount: number; contributionLevel: string }[];
  }[] = (await res.json())?.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
  // GraphQL errors still come back as 200s; fall back to the mirror instead
  if (!weeks.length) return null;

  return weeks.flatMap((week) =>
    week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: LEVELS[day.contributionLevel] ?? 0,
    })),
  );
}

// Without a token, use a public mirror of the profile's contribution calendar
async function fetchFromMirror(login: string): Promise<Day[] | null> {
  const res = await fetch(`${CALENDAR_API}/${login}?y=last`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;

  return (await res.json())?.contributions ?? null;
}

async function fetchCalendar(login: string): Promise<Contribution[] | null> {
  const days =
    (await fetchFromGitHub(login).catch(() => null)) ??
    (await fetchFromMirror(login).catch(() => null));
  if (!days?.length) return null;

  // columns are weeks, so the first day has to be a sunday or every column shears
  const start = days.findIndex((day) => new Date(`${day.date}T00:00:00Z`).getUTCDay() === 0);

  return days.slice(start < 0 ? 0 : start).map((day) => ({
    date: day.date,
    count: day.count,
    level: Math.min(4, Math.max(0, day.level)) as ContributionLevel,
  }));
}

type PushEvent = {
  type: string;
  repo?: { name: string };
  payload?: { commits?: unknown[] };
};

async function fetchRepos(login: string): Promise<RepoContribution[]> {
  const res = await fetch(`${EVENTS_API}/${login}/events/public?per_page=100`, {
    headers: authHeaders(),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return [];

  const events: PushEvent[] = await res.json();
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.type !== "PushEvent" || !event.repo) continue;
    // GitHub no longer lists commits on push events, so those count as one push each
    const commits = event.payload?.commits?.length ?? 1;
    counts.set(event.repo.name, (counts.get(event.repo.name) ?? 0) + commits);
  }

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, REPO_LIMIT)
    .map(([fullName, count]) => {
      const [owner, name] = fullName.split("/");
      return {
        name,
        count,
        href: `https://github.com/${fullName}`,
        // github has no repo logo, only an owner avatar, so own repos use the initial
        avatarUrl:
          owner && owner.toLowerCase() !== login.toLowerCase()
            ? `https://github.com/${owner}.png?size=64`
            : undefined,
      };
    });
}

// Null when the calendar can't be fetched or is empty, so the page can leave the
// section out instead of showing "0 contributions".
export async function getGitHubActivity(login: string): Promise<GitHubActivityData | null> {
  const [contributions, repos] = await Promise.all([
    fetchCalendar(login),
    fetchRepos(login).catch(() => []),
  ]);
  if (!contributions) return null;

  const total = contributions.reduce((sum, day) => sum + day.count, 0);
  return total > 0 ? { contributions, repos, total } : null;
}
