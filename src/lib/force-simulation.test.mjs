import assert from "node:assert/strict";
import test from "node:test";

import { ForceSimulation } from "./force-simulation.ts";

function makeNode(x, y, overrides = {}) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    fx: null,
    fy: null,
    collideRadius: 4,
    charge: -30,
    active: true,
    ...overrides,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test("a link pulls two distant nodes toward its length", () => {
  const nodes = [makeNode(-200, 0, { charge: 0 }), makeNode(200, 0, { charge: 0 })];
  const simulation = new ForceSimulation(nodes, [{ source: 0, target: 1, distance: 60 }], {
    gravityX: 0,
    gravityY: 0,
  });

  simulation.tick(300);

  assert.ok(Math.abs(distance(nodes[0], nodes[1]) - 60) < 6);
});

test("unlinked nodes push apart and don't overlap", () => {
  const nodes = [makeNode(0, 0), makeNode(0.5, 0.5), makeNode(-0.5, 0.25)];
  const simulation = new ForceSimulation(nodes, []);

  simulation.tick(300);

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      assert.ok(distance(nodes[i], nodes[j]) >= 7.5);
    }
  }
});

test("inactive nodes stay put and exert no force", () => {
  const nodes = [makeNode(0, 0), makeNode(1, 0, { active: false })];
  const simulation = new ForceSimulation(nodes, [{ source: 0, target: 1, distance: 50 }]);

  simulation.tick(50);

  assert.deepEqual([nodes[1].x, nodes[1].y], [1, 0]);
  assert.ok(Math.hypot(nodes[0].x, nodes[0].y) < 0.01);
});

test("pinned nodes follow fx/fy", () => {
  const nodes = [makeNode(0, 0, { fx: 40, fy: -20 }), makeNode(10, 10)];
  const simulation = new ForceSimulation(nodes, [{ source: 0, target: 1, distance: 30 }]);

  simulation.tick(20);

  assert.deepEqual([nodes[0].x, nodes[0].y], [40, -20]);
});

test("cools down and settles", () => {
  const simulation = new ForceSimulation([makeNode(0, 0), makeNode(5, 5)], []);

  assert.equal(simulation.settled, false);
  simulation.tick(320);
  assert.equal(simulation.settled, true);

  simulation.reheat(0.5);
  assert.equal(simulation.settled, false);
});
