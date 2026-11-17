// Which page of the site was open before this one, kept for as long as the tab stays loaded.
// Null on the first page of a visit.
let previous: string | null = null;
let current: string | null = null;

export function rememberPath(pathname: string) {
  if (pathname !== current) {
    previous = current;
    current = pathname;
  }
}

export function previousPath(): string | null {
  return previous;
}

// How the home page's projects were last shown, so coming back finds the list or the graph as
// you left it. Forgotten on a full reload, like the rest of this file.
export type View = "graph" | "list";

let projectsView: View = "list";

export function rememberProjectsView(view: View) {
  projectsView = view;
}

export function lastProjectsView(): View {
  return projectsView;
}
