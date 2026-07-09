import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MapNode, NodeType } from 'game-engine';
import { useRoguelikeStore } from '../stores/roguelikeStore';
import { useTranslation } from '../i18n';

const MAP_COLUMNS = 4;
const NODE_SIZE = 56;

const NODE_ICONS: Record<NodeType, string> = {
  combat: '⚔️',
  elite: '💀',
  camp: '🔥',
  treasure: '💎',
  event: '❓',
  boss: '👁️',
};

const NODE_COLORS: Record<NodeType, string> = {
  combat: 'border-void-500 bg-void-800/80',
  elite: 'border-red-700 bg-red-950/60',
  camp: 'border-amber-600 bg-amber-950/40',
  treasure: 'border-purple-500 bg-purple-950/50',
  event: 'border-blue-600 bg-blue-950/40',
  boss: 'border-gold-500 bg-void-900 ring-2 ring-amber-500/50',
};

type ConnectionState = 'traversed' | 'available' | 'future';

interface MapConnection {
  id: string;
  d: string;
  state: ConnectionState;
}

interface Props {
  onOpenReward: () => void;
  onOpenCamp: () => void;
  onOpenEvent: () => void;
}

function gridColumnForNode(node: MapNode, nodesInFloor: MapNode[], isBossFloor: boolean): number {
  if (isBossFloor) return Math.floor(MAP_COLUMNS / 2);
  const offset = Math.floor((MAP_COLUMNS - nodesInFloor.length) / 2);
  return node.column + offset;
}

function connectionState(
  from: MapNode,
  to: MapNode,
  currentNodeId: string | null,
  startNodeIds: string[],
  availableIds: Set<string>
): ConnectionState {
  const fromCurrent =
    from.id === currentNodeId ||
    (!currentNodeId && startNodeIds.includes(from.id));

  if (fromCurrent && availableIds.has(to.id)) return 'available';
  if (from.cleared && (to.cleared || to.visited)) return 'traversed';
  if (from.visited && to.visited) return 'traversed';
  return 'future';
}

const CONNECTION_STYLES: Record<ConnectionState, { stroke: string; width: number; opacity: number }> = {
  traversed: { stroke: 'rgba(192, 132, 252, 0.55)', width: 2.5, opacity: 1 },
  available: { stroke: 'rgba(251, 191, 36, 0.9)', width: 3, opacity: 1 },
  future: { stroke: 'rgba(100, 116, 139, 0.35)', width: 1.5, opacity: 1 },
};

export function RoguelikeMapScreen({
  onOpenReward,
  onOpenCamp,
  onOpenEvent,
}: Props) {
  const { t } = useTranslation();
  const run = useRoguelikeStore((s) => s.run);
  const phase = useRoguelikeStore((s) => s.phase);
  const selectNode = useRoguelikeStore((s) => s.selectNode);
  const abandonRun = useRoguelikeStore((s) => s.abandonRun);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const [connections, setConnections] = useState<MapConnection[]>([]);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  const setNodeRef = useCallback(
    (nodeId: string) => (el: HTMLButtonElement | null) => {
      if (el) nodeRefs.current.set(nodeId, el);
      else nodeRefs.current.delete(nodeId);
    },
    []
  );

  useEffect(() => {
    if (!run) return;
    if (phase === 'reward-cards' || phase === 'reward-relic') onOpenReward();
    else if (phase === 'camp') onOpenCamp();
    else if (phase === 'event') onOpenEvent();
  }, [run, phase, onOpenReward, onOpenCamp, onOpenEvent]);

  const recomputeConnections = useCallback(() => {
    const container = mapContainerRef.current;
    const map = run?.map;
    if (!container || !map) return;

    const containerRect = container.getBoundingClientRect();
    setMapSize({ width: containerRect.width, height: containerRect.height });

    const availableIds = new Set(
      map.nodes
        .filter((n) => {
          if (n.cleared) return false;
          if (!run.currentNodeId) return map.startNodeIds.includes(n.id);
          const current = map.nodes.find((x) => x.id === run.currentNodeId);
          return current?.connections.includes(n.id);
        })
        .map((n) => n.id)
    );

    const next: MapConnection[] = [];

    for (const from of map.nodes) {
      for (const targetId of from.connections) {
        const to = map.nodes.find((n) => n.id === targetId);
        if (!to) continue;

        const fromEl = nodeRefs.current.get(from.id);
        const toEl = nodeRefs.current.get(to.id);
        if (!fromEl || !toEl) continue;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
        const y1 = fromRect.bottom - containerRect.top;
        const x2 = toRect.left + toRect.width / 2 - containerRect.left;
        const y2 = toRect.top - containerRect.top;
        const midY = (y1 + y2) / 2;

        next.push({
          id: `${from.id}->${to.id}`,
          d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
          state: connectionState(from, to, run.currentNodeId, map.startNodeIds, availableIds),
        });
      }
    }

    setConnections(next);
  }, [run]);

  useLayoutEffect(() => {
    recomputeConnections();
    const frame = requestAnimationFrame(recomputeConnections);

    const scrollEl = scrollContainerRef.current;
    scrollEl?.addEventListener('scroll', recomputeConnections, { passive: true });
    window.addEventListener('resize', recomputeConnections);

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => recomputeConnections())
        : null;
    if (mapContainerRef.current) observer?.observe(mapContainerRef.current);

    return () => {
      cancelAnimationFrame(frame);
      scrollEl?.removeEventListener('scroll', recomputeConnections);
      window.removeEventListener('resize', recomputeConnections);
      observer?.disconnect();
    };
  }, [recomputeConnections]);

  if (!run) return null;

  if (phase !== 'map') {
    return (
      <div className="flex-1 flex items-center justify-center bg-void-950 text-void-400 text-sm">
        {t('common.loading')}
      </div>
    );
  }

  const available = run.map.nodes.filter((n) => {
    if (n.cleared) return false;
    if (!run.currentNodeId) return run.map.startNodeIds.includes(n.id);
    const current = run.map.nodes.find((x) => x.id === run.currentNodeId);
    return current?.connections.includes(n.id);
  });

  const floors = new Map<number, MapNode[]>();
  for (const node of run.map.nodes) {
    const list = floors.get(node.floor) ?? [];
    list.push(node);
    floors.set(node.floor, list);
  }

  const sortedFloors = [...floors.entries()].sort((a, b) => b[0] - a[0]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-void-950 safe-bottom">
      <div className="flex items-center justify-between px-4 py-3 border-b border-void-800">
        <div>
          <h1 className="text-lg font-bold text-void-100">{t('roguelike.title')}</h1>
          <p className="text-xs text-void-400">
            {t('roguelike.act', { act: run.act, total: 3 })} · {t('roguelike.hp', { current: run.heroHealth, max: run.heroMaxHealth })}
          </p>
        </div>
        <button
          type="button"
          onClick={abandonRun}
          className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
        >
          {t('roguelike.abandon')}
        </button>
      </div>

      {run.relics.length > 0 && (
        <div className="px-4 py-2 flex gap-2 flex-wrap border-b border-void-800/60">
          {run.relics.map((id) => (
            <span key={id} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-200 border border-purple-700/50">
              {t(`roguelike.relic.${id}`)}
            </span>
          ))}
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        <div
          ref={mapContainerRef}
          className="relative flex flex-col gap-8 items-center mx-auto"
          style={{ width: MAP_COLUMNS * (NODE_SIZE + 12) }}
        >
          {mapSize.width > 0 && mapSize.height > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none z-0"
              width={mapSize.width}
              height={mapSize.height}
              aria-hidden
            >
              {connections.map((line) => {
                const style = CONNECTION_STYLES[line.state];
                return (
                  <path
                    key={line.id}
                    d={line.d}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={style.width}
                    strokeLinecap="round"
                    opacity={style.opacity}
                  />
                );
              })}
            </svg>
          )}

          {sortedFloors.map(([floor, nodes]) => {
            const isBossFloor = floor === run.map.floors;
            const sortedNodes = [...nodes].sort((a, b) => a.column - b.column);

            return (
              <div key={floor} className="w-full relative z-10">
                <p className="text-[10px] text-void-500 text-center mb-2 uppercase tracking-wider">
                  {isBossFloor ? t('roguelike.bossFloor') : t('roguelike.floor', { n: floor + 1 })}
                </p>
                <div
                  className="grid justify-items-center gap-3"
                  style={{ gridTemplateColumns: `repeat(${MAP_COLUMNS}, ${NODE_SIZE}px)` }}
                >
                  {sortedNodes.map((node) => {
                    const col = gridColumnForNode(node, sortedNodes, isBossFloor);
                    const isAvailable = available.some((n) => n.id === node.id);
                    const isCleared = node.cleared;
                    const isCurrent = run.currentNodeId === node.id;

                    return (
                      <motion.button
                        key={node.id}
                        ref={setNodeRef(node.id)}
                        type="button"
                        disabled={!isAvailable || isCleared}
                        onClick={() => isAvailable && selectNode(node.id)}
                        whileTap={isAvailable ? { scale: 0.92 } : undefined}
                        style={{ gridColumn: col + 1 }}
                        className={`
                          w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl
                          transition-all relative z-10
                          ${NODE_COLORS[node.type]}
                          ${isCleared ? 'opacity-30' : ''}
                          ${isCurrent ? 'ring-2 ring-amber-400' : ''}
                          ${isAvailable && !isCleared ? 'hover:scale-105 cursor-pointer shadow-lg' : 'cursor-default'}
                          ${!isAvailable && !isCleared && !isCurrent ? 'opacity-20' : ''}
                        `}
                        title={t(`roguelike.node.${node.type}`)}
                      >
                        {NODE_ICONS[node.type]}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-void-500 pb-4 px-4">
        {t('roguelike.mapHint')}
      </p>
    </div>
  );
}
