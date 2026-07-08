import { mulberry32, pickRandom } from './rng.js';
import type { MapNode, NodeType, RunMap } from './types.js';

const FLOORS_PER_ACT = 12;
const COLUMNS = 4;

const NODE_WEIGHTS: { type: NodeType; weight: number }[] = [
  { type: 'combat', weight: 55 },
  { type: 'elite', weight: 12 },
  { type: 'camp', weight: 10 },
  { type: 'treasure', weight: 8 },
  { type: 'event', weight: 15 },
];

function assignNodeType(floor: number, rng: () => number, prevType: NodeType | null): NodeType {
  if (floor <= 3) {
    const early: NodeType[] = ['combat', 'combat', 'combat', 'event', 'treasure'];
    return pickRandom(early, rng);
  }

  const pool = NODE_WEIGHTS.filter(({ type }) => {
    if (type === 'elite' && floor < 4) return false;
    if (type === 'camp' && prevType === 'camp') return false;
    return true;
  });

  const total = pool.reduce((s, p) => s + p.weight, 0);
  let roll = rng() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'combat';
}

export function generateMap(seed: number, act = 1): RunMap {
  const rng = mulberry32(seed);
  const nodes: MapNode[] = [];
  const floorNodes: MapNode[][] = [];

  for (let floor = 0; floor <= FLOORS_PER_ACT; floor++) {
    const count = floor === 0 ? COLUMNS : floor === FLOORS_PER_ACT ? 1 : COLUMNS - 1 + Math.floor(rng() * 2);
    const row: MapNode[] = [];

    for (let col = 0; col < count; col++) {
      const isBoss = floor === FLOORS_PER_ACT;
      const prevRow = floor > 0 ? floorNodes[floor - 1] : null;
      const prevType = prevRow?.[Math.min(col, prevRow.length - 1)]?.type ?? null;

      const node: MapNode = {
        id: `n-${floor}-${col}`,
        floor,
        column: col,
        type: isBoss ? 'boss' : assignNodeType(floor, rng, prevType),
        connections: [],
        visited: floor === 0,
        cleared: false,
      };
      row.push(node);
      nodes.push(node);
    }
    floorNodes.push(row);
  }

  // Connect floors — each node links to 1-2 nodes on next floor
  for (let floor = 0; floor < FLOORS_PER_ACT; floor++) {
    const current = floorNodes[floor]!;
    const next = floorNodes[floor + 1]!;

    for (let ci = 0; ci < current.length; ci++) {
      const node = current[ci]!;
      const targets = new Set<string>();

      const primary = Math.min(ci, next.length - 1);
      targets.add(next[primary]!.id);

      if (rng() < 0.45 && ci + 1 < next.length) {
        targets.add(next[ci + 1]!.id);
      }
      if (rng() < 0.25 && ci > 0) {
        targets.add(next[ci - 1]!.id);
      }

      node.connections = [...targets];
    }
  }

  // Ensure boss reachable — connect any orphan next-floor nodes
  for (let floor = 0; floor < FLOORS_PER_ACT; floor++) {
    const next = floorNodes[floor + 1]!;
    const connected = new Set<string>();
    for (const n of floorNodes[floor]!) {
      for (const id of n.connections) connected.add(id);
    }
    for (const n of next) {
      if (!connected.has(n.id) && floorNodes[floor]!.length > 0) {
        const parent = pickRandom(floorNodes[floor]!, rng);
        parent.connections.push(n.id);
      }
    }
  }

  const startNodeIds = floorNodes[0]!.map((n) => n.id);
  const bossNodeId = floorNodes[FLOORS_PER_ACT]![0]!.id;

  return {
    seed,
    act,
    floors: FLOORS_PER_ACT,
    nodes,
    startNodeIds,
    bossNodeId,
  };
}

export function getAvailableNodes(map: RunMap, currentNodeId: string | null): MapNode[] {
  if (!currentNodeId) {
    return map.nodes.filter((n) => map.startNodeIds.includes(n.id) && !n.cleared);
  }
  const current = map.nodes.find((n) => n.id === currentNodeId);
  if (!current) return [];
  return map.nodes.filter((n) => current.connections.includes(n.id) && !n.cleared);
}

export function getNodeById(map: RunMap, nodeId: string): MapNode | undefined {
  return map.nodes.find((n) => n.id === nodeId);
}

export function markNodeCleared(map: RunMap, nodeId: string): RunMap {
  const nodes = map.nodes.map((n) => {
    if (n.id === nodeId) return { ...n, cleared: true, visited: true };
    if (n.connections.includes(nodeId) || map.startNodeIds.includes(nodeId)) {
      return n;
    }
    return n;
  });
  return { ...map, nodes };
}

export function advanceToNode(map: RunMap, nodeId: string): RunMap {
  const nodes = map.nodes.map((n) =>
    n.id === nodeId ? { ...n, visited: true } : n
  );
  return { ...map, nodes };
}
