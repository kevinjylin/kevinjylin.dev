import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProjectGraph,
  getProjectGroup,
  highlightGroup,
  highlightNode,
  highlightSearch,
  listMonths,
} from "./project-graph-data.ts";

function makeProject(slug, date, tags, overrides = {}) {
  return {
    slug,
    title: slug.toUpperCase(),
    summary: `${slug} summary`,
    date,
    tags,
    featured: true,
    ...overrides,
  };
}

const projects = [
  makeProject("alpha", "2026-03", ["Next.js", "Supabase"]),
  makeProject("beta", "2025-11", ["Gemini", "supabase"], { event: "Hack 2025" }),
  makeProject("gamma", "2026-04", ["Swift"], { featured: false }),
];

test("lists every month between two dates", () => {
  assert.deepEqual(listMonths("2025-11", "2026-02"), ["2025-11", "2025-12", "2026-01", "2026-02"]);
  assert.deepEqual(listMonths("2026-05", "2026-05"), ["2026-05"]);
});

test("groups projects by event and featured flag", () => {
  assert.equal(getProjectGroup(projects[0]), "product");
  assert.equal(getProjectGroup(projects[1]), "hackathon");
  assert.equal(getProjectGroup(projects[2]), "side");
});

test("builds project and tag nodes with shared tags merged", () => {
  const graph = buildProjectGraph(projects);
  const labels = graph.nodes.map((node) => node.label);

  assert.deepEqual(labels, ["ALPHA", "BETA", "GAMMA", "Next.js", "Supabase", "Gemini", "Swift"]);
  assert.equal(graph.projectCount, 3);
  assert.equal(graph.tagCount, 4);
  assert.equal(graph.links.length, 5);

  const supabase = graph.nodes[4];
  assert.deepEqual(supabase.neighbors, [0, 1]);
  // A tag appears with the earliest project that uses it
  assert.equal(supabase.born, "2025-11");
  // Shared tags are drawn larger
  assert.ok(supabase.radius > graph.nodes[3].radius);
  assert.deepEqual(graph.months, [
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-04",
  ]);
});

test("hovering a project lights its tags and the projects that share them", () => {
  const graph = buildProjectGraph(projects);
  const { nodes } = highlightNode(graph, 0);

  assert.equal(nodes.get(0), 2);
  assert.equal(nodes.get(3), 2);
  assert.equal(nodes.get(4), 2);
  assert.equal(nodes.get(1), 1);
  assert.equal(nodes.has(2), false);
});

test("hovering a tag lights only the projects that use it", () => {
  const graph = buildProjectGraph(projects);
  const { nodes } = highlightNode(graph, 4);

  assert.deepEqual([...nodes.keys()].sort(), [0, 1, 4]);
});

test("highlights a whole group", () => {
  const graph = buildProjectGraph(projects);
  const { nodes } = highlightGroup(graph, "hackathon");

  assert.equal(nodes.get(1), 2);
  assert.equal(nodes.get(4), 1);
  assert.equal(nodes.has(0), false);
});

test("searches titles, summaries and tags", () => {
  const graph = buildProjectGraph(projects);

  assert.equal(highlightSearch(graph, "  "), null);
  const gemini = highlightSearch(graph, "gemini").nodes;
  // Matches are lit fully, their neighbors softly
  assert.equal(gemini.get(1), 2);
  assert.equal(gemini.get(5), 2);
  assert.equal(gemini.get(4), 1);
  assert.equal(gemini.has(0), false);
  assert.equal(highlightSearch(graph, "hack 2025").nodes.get(1), 2);
});
