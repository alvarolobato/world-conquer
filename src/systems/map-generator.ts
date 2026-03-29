import { TerrainType } from '@/types/game';
import type { Point, Region, GameMap, ResourceNode } from '@/types/game';
import { TERRAIN_CONFIG } from '@/config/game-config';

// Seeded random number generator (mulberry32)
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distanceSq(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function distance(a: Point, b: Point): number {
  return Math.sqrt(distanceSq(a, b));
}

// Generate Voronoi-like regions using Lloyd relaxation on random seeds
function generateVoronoiRegions(
  width: number,
  height: number,
  regionCount: number,
  rng: () => number,
  relaxIterations: number = 3
): Point[] {
  // Start with random points
  let points: Point[] = [];
  for (let i = 0; i < regionCount; i++) {
    points.push({
      x: rng() * width,
      y: rng() * height,
    });
  }

  // Lloyd relaxation: move each point to centroid of its Voronoi cell
  for (let iter = 0; iter < relaxIterations; iter++) {
    const sums: Point[] = points.map(() => ({ x: 0, y: 0 }));
    const counts: number[] = new Array(points.length).fill(0);

    // Sample grid points and assign to nearest seed
    const step = 8;
    for (let gx = 0; gx < width; gx += step) {
      for (let gy = 0; gy < height; gy += step) {
        let minD = Infinity;
        let minI = 0;
        for (let i = 0; i < points.length; i++) {
          const d = distanceSq(points[i], { x: gx, y: gy });
          if (d < minD) {
            minD = d;
            minI = i;
          }
        }
        sums[minI].x += gx;
        sums[minI].y += gy;
        counts[minI]++;
      }
    }

    // Update points to centroids
    points = points.map((p, i) => {
      if (counts[i] === 0) return p;
      return {
        x: sums[i].x / counts[i],
        y: sums[i].y / counts[i],
      };
    });
  }

  return points;
}

// Compute polygon boundaries for each Voronoi cell by sampling
function computeRegionPolygons(
  centroids: Point[],
  width: number,
  height: number
): Point[][] {
  // For each centroid, collect boundary points
  const step = 4;
  const cellPixels: Map<number, Point[]> = new Map();

  for (let i = 0; i < centroids.length; i++) {
    cellPixels.set(i, []);
  }

  // Assign each grid point to nearest centroid
  const grid: number[][] = [];
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);

  for (let gy = 0; gy < rows; gy++) {
    grid[gy] = [];
    for (let gx = 0; gx < cols; gx++) {
      const px = gx * step;
      const py = gy * step;
      let minD = Infinity;
      let minI = 0;
      for (let i = 0; i < centroids.length; i++) {
        const d = distanceSq(centroids[i], { x: px, y: py });
        if (d < minD) {
          minD = d;
          minI = i;
        }
      }
      grid[gy][gx] = minI;
    }
  }

  // Find boundary pixels (pixels adjacent to a different region)
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const cellId = grid[gy][gx];
      const isBorder =
        gx === 0 || gy === 0 || gx === cols - 1 || gy === rows - 1 ||
        grid[gy - 1]?.[gx] !== cellId ||
        grid[gy + 1]?.[gx] !== cellId ||
        grid[gy]?.[gx - 1] !== cellId ||
        grid[gy]?.[gx + 1] !== cellId;

      if (isBorder) {
        cellPixels.get(cellId)!.push({ x: gx * step, y: gy * step });
      }
    }
  }

  // Convert boundary points to ordered polygon using angular sort
  const polygons: Point[][] = [];
  for (let i = 0; i < centroids.length; i++) {
    const border = cellPixels.get(i) || [];
    const cx = centroids[i].x;
    const cy = centroids[i].y;

    // Sort by angle from centroid
    border.sort((a, b) => {
      return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
    });

    // Simplify: take every Nth point to reduce polygon complexity
    const simplified: Point[] = [];
    const skipFactor = Math.max(1, Math.floor(border.length / 24));
    for (let j = 0; j < border.length; j += skipFactor) {
      simplified.push(border[j]);
    }

    polygons.push(simplified.length >= 3 ? simplified : border.slice(0, Math.min(border.length, 24)));
  }

  return polygons;
}

// Build adjacency from the grid
function computeAdjacency(
  centroids: Point[],
  width: number,
  height: number
): Record<string, string[]> {
  const step = 8;
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);

  // Build grid assignment
  const grid: number[][] = [];
  for (let gy = 0; gy < rows; gy++) {
    grid[gy] = [];
    for (let gx = 0; gx < cols; gx++) {
      const px = gx * step;
      const py = gy * step;
      let minD = Infinity;
      let minI = 0;
      for (let i = 0; i < centroids.length; i++) {
        const d = distanceSq(centroids[i], { x: px, y: py });
        if (d < minD) {
          minD = d;
          minI = i;
        }
      }
      grid[gy][gx] = minI;
    }
  }

  // Find neighbors
  const neighbors: Set<string>[] = centroids.map(() => new Set<string>());

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const cellId = grid[gy][gx];
      const check = [
        grid[gy - 1]?.[gx],
        grid[gy + 1]?.[gx],
        grid[gy]?.[gx - 1],
        grid[gy]?.[gx + 1],
      ];
      for (const n of check) {
        if (n !== undefined && n !== cellId) {
          neighbors[cellId].add(`r_${n}`);
          neighbors[n].add(`r_${cellId}`);
        }
      }
    }
  }

  const adjacency: Record<string, string[]> = {};
  for (let i = 0; i < centroids.length; i++) {
    adjacency[`r_${i}`] = [...neighbors[i]];
  }
  return adjacency;
}

// Assign terrain using Perlin-like noise (simplified)
function assignTerrain(
  centroids: Point[],
  width: number,
  height: number,
  rng: () => number
): TerrainType[] {
  const terrains: TerrainType[] = [];

  // Simple noise: create a few "biome centers" and blend
  const biomeCenters: Array<{ pos: Point; terrain: TerrainType }> = [];
  const biomeTypes = [
    TerrainType.PLAINS, TerrainType.PLAINS, TerrainType.PLAINS,
    TerrainType.FOREST, TerrainType.FOREST,
    TerrainType.MOUNTAIN,
    TerrainType.DESERT,
    TerrainType.SNOW,
  ];

  const numBiomes = 8 + Math.floor(rng() * 5);
  for (let i = 0; i < numBiomes; i++) {
    biomeCenters.push({
      pos: { x: rng() * width, y: rng() * height },
      terrain: biomeTypes[Math.floor(rng() * biomeTypes.length)],
    });
  }

  for (const centroid of centroids) {
    // Edge of map = ocean
    const edgeDist = Math.min(centroid.x, centroid.y, width - centroid.x, height - centroid.y);
    if (edgeDist < 40) {
      terrains.push(TerrainType.OCEAN);
      continue;
    }
    if (edgeDist < 70 && rng() < 0.4) {
      terrains.push(TerrainType.OCEAN);
      continue;
    }

    // Find nearest biome center
    let minD = Infinity;
    let terrain = TerrainType.PLAINS;
    for (const bc of biomeCenters) {
      const d = distance(centroid, bc.pos);
      if (d < minD) {
        minD = d;
        terrain = bc.terrain;
      }
    }

    // Add some rivers near mountains
    if (terrain === TerrainType.MOUNTAIN && rng() < 0.2) {
      terrain = TerrainType.RIVER;
    }

    terrains.push(terrain);
  }

  return terrains;
}

// Generate resource nodes based on terrain
function generateResources(
  terrain: TerrainType,
  centroid: Point,
  rng: () => number
): ResourceNode[] {
  const props = TERRAIN_CONFIG[terrain];
  const resources: ResourceNode[] = [];

  for (const type of props.resourceTypes) {
    if (rng() < 0.6) {
      resources.push({
        type,
        amount: 50 + Math.floor(rng() * 150),
        position: {
          x: centroid.x + (rng() - 0.5) * 20,
          y: centroid.y + (rng() - 0.5) * 20,
        },
      });
    }
  }

  return resources;
}

// Main map generation function
export function generateMap(
  seed: number,
  regionCount: number,
  width: number,
  height: number
): GameMap {
  const rng = seededRandom(seed);

  // Generate centroids with Lloyd relaxation
  const centroids = generateVoronoiRegions(width, height, regionCount, rng);

  // Compute polygons
  const polygons = computeRegionPolygons(centroids, width, height);

  // Compute adjacency
  const adjacency = computeAdjacency(centroids, width, height);

  // Assign terrain
  const terrains = assignTerrain(centroids, width, height, rng);

  // Build regions
  const regions: Region[] = centroids.map((centroid, i) => ({
    id: `r_${i}`,
    polygon: polygons[i],
    centroid,
    terrain: terrains[i],
    resources: generateResources(terrains[i], centroid, rng),
    owner: null,
    buildings: [],
  }));

  return { seed, width, height, regions, adjacency };
}

// Get the terrain color for rendering
export function getTerrainColor(terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.PLAINS: return 0x6abf4b;
    case TerrainType.FOREST: return 0x2d7a2d;
    case TerrainType.MOUNTAIN: return 0x8a8a8a;
    case TerrainType.DESERT: return 0xd4b84a;
    case TerrainType.RIVER: return 0x4a8fd4;
    case TerrainType.OCEAN: return 0x1a5599;
    case TerrainType.SNOW: return 0xddeeff;
  }
}

// Find region at a given point
export function getRegionAtPoint(map: GameMap, point: Point): Region | null {
  let closest: Region | null = null;
  let minDist = Infinity;

  for (const region of map.regions) {
    const d = distanceSq(region.centroid, point);
    if (d < minDist) {
      minDist = d;
      closest = region;
    }
  }

  return closest;
}

// Get claimable (unclaimed, non-ocean, non-river) neighbors of a player's territory
export function getClaimableNeighbors(map: GameMap, playerId: string): Region[] {
  const owned = new Set(
    map.regions.filter((r) => r.owner === playerId).map((r) => r.id)
  );

  const claimable = new Set<string>();
  for (const regionId of owned) {
    const neighbors = map.adjacency[regionId] || [];
    for (const nId of neighbors) {
      if (!owned.has(nId)) {
        const region = map.regions.find((r) => r.id === nId);
        if (region && !region.owner && region.terrain !== TerrainType.OCEAN && region.terrain !== TerrainType.RIVER) {
          claimable.add(nId);
        }
      }
    }
  }

  return [...claimable].map((id) => map.regions.find((r) => r.id === id)!);
}

// Count unclaimed land regions
export function getUnclaimedLandCount(map: GameMap): number {
  return map.regions.filter(
    (r) => !r.owner && r.terrain !== TerrainType.OCEAN && r.terrain !== TerrainType.RIVER
  ).length;
}
