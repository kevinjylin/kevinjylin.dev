import type { ProjectMetadata } from "@/lib/projects";

export type ProjectGroup = "product" | "hackathon" | "side";

export const PROJECT_GROUPS: Array<{ id: ProjectGroup; label: string }> = [
  { id: "product", label: "Products" },
  { id: "hackathon", label: "Hackathons" },
  { id: "side", label: "Side projects" },
];

// Anything built at an event is a hackathon project; unfeatured work is a side project.
export function getProjectGroup(project: ProjectMetadata): ProjectGroup {
  if (project.event) {
    return "hackathon";
  }

  return project.featured ? "product" : "side";
}

type BaseNode = {
  id: string;
  label: string;
  // "YYYY-MM" the node first appears
  born: string;
  // Indexes of linked nodes
  neighbors: number[];
  radius: number;
};

export type ProjectNode = BaseNode & {
  kind: "project";
  group: ProjectGroup;
  project: ProjectMetadata;
};

export type TagNode = BaseNode & {
  kind: "tag";
};

export type GraphNode = ProjectNode | TagNode;

// Always project → tag
export type GraphLink = {
  source: number;
  target: number;
};

export type ProjectGraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
  // Every month from the first project to the latest, "YYYY-MM"
  months: string[];
  projectCount: number;
  tagCount: number;
};

export function listMonths(from: string, to: string): string[] {
  const months: string[] = [];
  let [year, month] = from.split("-").map(Number);
  const [endYear, endMonth] = to.split("-").map(Number);

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

// Projects become nodes, every tag becomes a node, and each project links to its tags.
// Projects keep their incoming order and come before the tags.
export function buildProjectGraph(projects: ProjectMetadata[]): ProjectGraphData {
  const nodes: GraphNode[] = projects.map((project) => ({
    id: `project:${project.slug}`,
    kind: "project",
    label: project.title,
    born: project.date,
    neighbors: [],
    radius: 0,
    group: getProjectGroup(project),
    project,
  }));
  const links: GraphLink[] = [];
  const tagIndexes = new Map<string, number>();

  projects.forEach((project, projectIndex) => {
    for (const tag of project.tags) {
      const key = tag.toLowerCase();
      let tagIndex = tagIndexes.get(key);

      if (tagIndex === undefined) {
        tagIndex = nodes.length;
        tagIndexes.set(key, tagIndex);
        nodes.push({
          id: `tag:${key}`,
          kind: "tag",
          label: tag,
          born: project.date,
          neighbors: [],
          radius: 0,
        });
      }

      const tagNode = nodes[tagIndex];

      if (tagNode.neighbors.includes(projectIndex)) {
        continue;
      }

      if (project.date < tagNode.born) {
        tagNode.born = project.date;
      }

      links.push({ source: projectIndex, target: tagIndex });
      nodes[projectIndex].neighbors.push(tagIndex);
      tagNode.neighbors.push(projectIndex);
    }
  });

  // Bigger circles for better-connected nodes, like Obsidian
  for (const node of nodes) {
    const degree = node.neighbors.length;

    if (node.kind === "project") {
      node.radius = (node.group === "side" ? 6.5 : 8) + Math.sqrt(degree) * 1.5;
    } else {
      node.radius = Math.min(7.5, 3 + (degree - 1) * 1.4);
    }
  }

  const dates = projects.map((project) => project.date).sort();

  return {
    nodes,
    links,
    months: dates.length > 0 ? listMonths(dates[0], dates[dates.length - 1]) : [],
    projectCount: projects.length,
    tagCount: nodes.length - projects.length,
  };
}

export type HighlightLevel = 1 | 2;

export type Highlight = {
  nodes: Map<number, HighlightLevel>;
  links: Map<number, HighlightLevel>;
};

function raise<K>(map: Map<K, HighlightLevel>, key: K, level: HighlightLevel) {
  if ((map.get(key) ?? 0) < level) {
    map.set(key, level);
  }
}

// Level 2 is the thing being looked at and what it touches directly; level 1 is one step
// further out (e.g. other projects that share a tag with a hovered project).
export function highlightNode(graph: ProjectGraphData, index: number): Highlight {
  const nodes = new Map<number, HighlightLevel>([[index, 2]]);
  const links = new Map<number, HighlightLevel>();
  const focus = graph.nodes[index];

  graph.links.forEach((link, linkIndex) => {
    if (link.source === index || link.target === index) {
      raise(links, linkIndex, 2);
      raise(nodes, link.source === index ? link.target : link.source, 2);
    }
  });

  if (focus.kind === "project") {
    graph.links.forEach((link, linkIndex) => {
      if (focus.neighbors.includes(link.target) && link.source !== index) {
        raise(links, linkIndex, 1);
        raise(nodes, link.source, 1);
      }
    });
  }

  return { nodes, links };
}

export function highlightGroup(graph: ProjectGraphData, group: ProjectGroup): Highlight {
  const nodes = new Map<number, HighlightLevel>();
  const links = new Map<number, HighlightLevel>();

  graph.links.forEach((link, linkIndex) => {
    const source = graph.nodes[link.source];

    if (source.kind === "project" && source.group === group) {
      raise(nodes, link.source, 2);
      raise(nodes, link.target, 1);
      raise(links, linkIndex, 1);
    }
  });

  graph.nodes.forEach((node, nodeIndex) => {
    if (node.kind === "project" && node.group === group) {
      raise(nodes, nodeIndex, 2);
    }
  });

  return { nodes, links };
}

function getSearchText(node: GraphNode) {
  if (node.kind === "tag") {
    return node.label;
  }

  const { project } = node;

  return [
    project.title,
    project.summary,
    project.kind,
    project.event,
    project.award,
    ...project.tags,
  ]
    .filter(Boolean)
    .join(" ");
}

export function highlightSearch(graph: ProjectGraphData, query: string): Highlight | null {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return null;
  }

  const nodes = new Map<number, HighlightLevel>();
  const links = new Map<number, HighlightLevel>();
  const matches = new Set<number>();

  graph.nodes.forEach((node, nodeIndex) => {
    if (getSearchText(node).toLowerCase().includes(needle)) {
      matches.add(nodeIndex);
      raise(nodes, nodeIndex, 2);
    }
  });

  graph.links.forEach((link, linkIndex) => {
    const sourceMatch = matches.has(link.source);
    const targetMatch = matches.has(link.target);

    if (sourceMatch && targetMatch) {
      raise(links, linkIndex, 2);
    } else if (sourceMatch || targetMatch) {
      raise(links, linkIndex, 1);
      raise(nodes, sourceMatch ? link.target : link.source, 1);
    }
  });

  return { nodes, links };
}
