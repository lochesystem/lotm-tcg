import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { MapNode, NodeType } from 'game-engine';
import { useRoguelikeStore } from '../stores/roguelikeStore';
import { useTranslation } from '../i18n';

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

interface Props {
  onOpenReward: () => void;
  onOpenCamp: () => void;
  onOpenEvent: () => void;
}

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

  useEffect(() => {
    if (!run) return;
    if (phase === 'reward-cards' || phase === 'reward-relic') onOpenReward();
    else if (phase === 'camp') onOpenCamp();
    else if (phase === 'event') onOpenEvent();
  }, [run, phase, onOpenReward, onOpenCamp, onOpenEvent]);

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

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6 items-center max-w-md mx-auto">
          {sortedFloors.map(([floor, nodes]) => (
            <div key={floor} className="w-full">
              <p className="text-[10px] text-void-500 text-center mb-2 uppercase tracking-wider">
                {floor === run.map.floors + 1 ? t('roguelike.bossFloor') : t('roguelike.floor', { n: floor })}
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                {nodes.map((node) => {
                  const isAvailable = available.some((n) => n.id === node.id);
                  const isCleared = node.cleared;
                  const isCurrent = run.currentNodeId === node.id;

                  return (
                    <motion.button
                      key={node.id}
                      type="button"
                      disabled={!isAvailable || isCleared}
                      onClick={() => isAvailable && selectNode(node.id)}
                      whileTap={isAvailable ? { scale: 0.92 } : undefined}
                      className={`
                        w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl
                        transition-all
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
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-void-500 pb-4 px-4">
        {t('roguelike.mapHint')}
      </p>
    </div>
  );
}
