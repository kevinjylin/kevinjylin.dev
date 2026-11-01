// A small force-directed layout in the spirit of d3-force: springy links, node repulsion,
// gentle gravity toward the origin and collision. Sized for a few dozen nodes, so every
// pair is compared directly instead of using a quadtree.

export type SimNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // A pinned position, e.g. while the node is being dragged
  fx: number | null;
  fy: number | null;
  // Nodes keep at least this far apart from each other's centers (sum of both radii)
  collideRadius: number;
  // Negative values repel other nodes
  charge: number;
  // Inactive nodes are frozen and ignored by every force
  active: boolean;
  // Scales the pull toward the origin (defaults to 1)
  gravity?: number;
};

export type SimLink = {
  source: number;
  target: number;
  distance: number;
};

export type SimulationOptions = {
  alphaMin?: number;
  alphaDecay?: number;
  collideStrength?: number;
  distanceMax?: number;
  gravityX?: number;
  gravityY?: number;
  seed?: number;
  velocityDecay?: number;
};

export class ForceSimulation {
  nodes: SimNode[];
  links: SimLink[];
  alpha = 1;
  alphaTarget = 0;
  gravityX: number;
  gravityY: number;

  private alphaMin: number;
  private alphaDecay: number;
  private collideStrength: number;
  private distanceMax2: number;
  private velocityDecay: number;
  private randomState: number;
  private degree: number[] = [];

  constructor(nodes: SimNode[], links: SimLink[], options: SimulationOptions = {}) {
    this.nodes = nodes;
    this.links = links;
    this.alphaMin = options.alphaMin ?? 0.001;
    // Cools from 1 to alphaMin in about 300 ticks
    this.alphaDecay = options.alphaDecay ?? 1 - Math.pow(this.alphaMin, 1 / 300);
    this.collideStrength = options.collideStrength ?? 0.7;
    this.distanceMax2 = (options.distanceMax ?? 520) ** 2;
    this.gravityX = options.gravityX ?? 0.04;
    this.gravityY = options.gravityY ?? 0.06;
    this.velocityDecay = 1 - (options.velocityDecay ?? 0.4);
    this.randomState = options.seed ?? 1;
  }

  get settled() {
    return this.alpha < this.alphaMin && this.alphaTarget === 0;
  }

  reheat(alpha = 1) {
    this.alpha = Math.max(this.alpha, alpha);
  }

  tick(iterations = 1) {
    for (let step = 0; step < iterations; step += 1) {
      this.alpha += (this.alphaTarget - this.alpha) * this.alphaDecay;
      this.applyLinks();
      this.applyCharge();
      this.applyGravity();
      this.applyCollision();
      this.integrate();
    }
  }

  // Tiny deterministic nudge so coincident nodes can separate
  private jiggle() {
    this.randomState = (this.randomState * 1664525 + 1013904223) % 4294967296;
    return (this.randomState / 4294967296 - 0.5) * 1e-6;
  }

  private applyLinks() {
    const { nodes, links } = this;
    this.degree = nodes.map(() => 0);

    for (const link of links) {
      if (nodes[link.source].active && nodes[link.target].active) {
        this.degree[link.source] += 1;
        this.degree[link.target] += 1;
      }
    }

    for (const link of links) {
      const source = nodes[link.source];
      const target = nodes[link.target];

      if (!source.active || !target.active) {
        continue;
      }

      const sourceDegree = this.degree[link.source];
      const targetDegree = this.degree[link.target];
      const strength = 1 / Math.min(sourceDegree, targetDegree);
      // The better-connected end moves less
      const bias = sourceDegree / (sourceDegree + targetDegree);

      let x = target.x + target.vx - source.x - source.vx || this.jiggle();
      let y = target.y + target.vy - source.y - source.vy || this.jiggle();
      let length = Math.sqrt(x * x + y * y);
      length = ((length - link.distance) / length) * this.alpha * strength;
      x *= length;
      y *= length;

      target.vx -= x * bias;
      target.vy -= y * bias;
      source.vx += x * (1 - bias);
      source.vy += y * (1 - bias);
    }
  }

  private applyCharge() {
    const { nodes, alpha } = this;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];

      if (!a.active) {
        continue;
      }

      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];

        if (!b.active) {
          continue;
        }

        let x = b.x - a.x || this.jiggle();
        let y = b.y - a.y || this.jiggle();
        let distance2 = x * x + y * y;

        if (distance2 > this.distanceMax2) {
          continue;
        }

        // Soften the force at very short range so overlapping nodes don't explode apart
        if (distance2 < 1) {
          distance2 = Math.sqrt(distance2);
        }

        x /= distance2;
        y /= distance2;
        a.vx += x * b.charge * alpha;
        a.vy += y * b.charge * alpha;
        b.vx -= x * a.charge * alpha;
        b.vy -= y * a.charge * alpha;
      }
    }
  }

  private applyGravity() {
    for (const node of this.nodes) {
      if (node.active) {
        const strength = (node.gravity ?? 1) * this.alpha;
        node.vx -= node.x * this.gravityX * strength;
        node.vy -= node.y * this.gravityY * strength;
      }
    }
  }

  private applyCollision() {
    const { nodes } = this;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];

      if (!a.active) {
        continue;
      }

      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];

        if (!b.active) {
          continue;
        }

        const radius = a.collideRadius + b.collideRadius;
        let x = a.x + a.vx - b.x - b.vx || this.jiggle();
        let y = a.y + a.vy - b.y - b.vy || this.jiggle();
        let distance = x * x + y * y;

        if (distance >= radius * radius) {
          continue;
        }

        distance = Math.sqrt(distance);
        const push = ((radius - distance) / distance) * this.collideStrength;
        x *= push;
        y *= push;

        // Smaller nodes get pushed further
        const a2 = a.collideRadius * a.collideRadius;
        const b2 = b.collideRadius * b.collideRadius;
        const share = b2 / (a2 + b2);

        a.vx += x * share;
        a.vy += y * share;
        b.vx -= x * (1 - share);
        b.vy -= y * (1 - share);
      }
    }
  }

  private integrate() {
    for (const node of this.nodes) {
      if (!node.active) {
        continue;
      }

      if (node.fx === null) {
        node.vx *= this.velocityDecay;
        node.x += node.vx;
      } else {
        node.x = node.fx;
        node.vx = 0;
      }

      if (node.fy === null) {
        node.vy *= this.velocityDecay;
        node.y += node.vy;
      } else {
        node.y = node.fy;
        node.vy = 0;
      }
    }
  }
}
