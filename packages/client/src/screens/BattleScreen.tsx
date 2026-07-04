import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { CardComponent } from '../components/Card';
import { AnimatedBoard } from '../components/AnimatedBoard';
import { HeroPortrait } from '../components/HeroPortrait';
import { TurnBanner } from '../components/TurnBanner';
import { AttackImpact } from '../components/AttackImpact';
import { AttackArrow } from '../components/AttackArrow';
import { NpcPlayReveal } from '../components/NpcPlayReveal';
import { GameAction, validateAction } from 'game-engine';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PATHWAYS } from 'game-engine';
import { getAttackTargets, formatAttackError } from '../utils/combatTargets';
import { formatGameEvent } from '../utils/battleLog';

interface Props {
  onNavigate: (screen: Screen) => void;
}

interface BattleLogEntry {
  id: number;
  text: string;
  type: 'action' | 'damage' | 'system' | 'reward' | 'enemy';
}

export function BattleScreen({ onNavigate }: Props) {
  const { gameState, playerId, opponentId, performAction, reset, npcThinking, pendingAttack, npcPlayReveal } = useGameStore();
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [showAttackAnim, setShowAttackAnim] = useState(false);
  const [attackingMinion, setAttackingMinion] = useState<string | null>(null);
  const [damagedMinion, setDamagedMinion] = useState<string | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [showGraveyard, setShowGraveyard] = useState<'player' | 'opponent' | null>(null);
  const [graveyardDetail, setGraveyardDetail] = useState<import('game-engine').Card | null>(null);
  const [arrowTargetId, setArrowTargetId] = useState<string | null>(null);
  const [arrowTargetHero, setArrowTargetHero] = useState(false);
  const [damagedHero, setDamagedHero] = useState<'player' | 'opponent' | null>(null);
  const [impactTarget, setImpactTarget] = useState<{
    targetId: string | null;
    targetHero: 'player' | 'opponent' | null;
  } | null>(null);
  const logIdRef = useRef(0);
  const processedLogRef = useRef(0);

  // Sync battle log from game engine events (player + NPC)
  useEffect(() => {
    if (!gameState) {
      processedLogRef.current = 0;
      return;
    }
    const newEvents = gameState.log.slice(processedLogRef.current);
    processedLogRef.current = gameState.log.length;
    if (newEvents.length === 0) return;

    const entries: BattleLogEntry[] = [];
    const baseIndex = processedLogRef.current - newEvents.length;
    for (let i = 0; i < newEvents.length; i++) {
      const formatted = formatGameEvent(newEvents[i], gameState, playerId, opponentId, baseIndex + i);
      if (formatted) {
        entries.push({ id: ++logIdRef.current, ...formatted });
      }
    }
    if (entries.length > 0) {
      setBattleLog((prev) => [...prev.slice(-40), ...entries]);
    }
  }, [gameState, gameState?.log.length, playerId, opponentId]);

  useEffect(() => {
    processedLogRef.current = 0;
    setBattleLog([]);
    logIdRef.current = 0;
  }, [gameState?.id]);

  // Sync NPC combat animation phases from store
  useEffect(() => {
    if (!pendingAttack?.isNpc) return;

    const { phase, attackerId, targetId, targetHero } = pendingAttack;

    if (phase === 'preview') {
      setAttackingMinion(null);
      setDamagedMinion(null);
      setDamagedHero(null);
      setImpactTarget(null);
      setShowAttackAnim(false);
      return;
    }

    if (phase === 'strike') {
      setAttackingMinion(attackerId);
      setDamagedMinion(null);
      setDamagedHero(null);
      setImpactTarget(null);
      setShowAttackAnim(false);
      return;
    }

    // impact
    setAttackingMinion(attackerId);
    if (targetId) {
      setDamagedMinion(targetId);
      setDamagedHero(null);
    } else if (targetHero) {
      setDamagedMinion(null);
      setDamagedHero(targetHero);
    }
    setImpactTarget({ targetId, targetHero });
    setShowAttackAnim(true);
    const timer = setTimeout(() => setShowAttackAnim(false), 550);
    return () => clearTimeout(timer);
  }, [pendingAttack]);

  useEffect(() => {
    if (!pendingAttack) {
      const timer = setTimeout(() => {
        setAttackingMinion(null);
        setDamagedMinion(null);
        setDamagedHero(null);
        setImpactTarget(null);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [pendingAttack]);

  if (!gameState) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-4">
        <p className="text-void-400">Nenhuma partida em andamento</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-purple-700 rounded-lg text-sm"
        >
          Voltar ao Menu
        </button>
      </div>
    );
  }

  const playerIdx = gameState.players.findIndex((p) => p.id === playerId);
  const player = gameState.players[playerIdx];
  const opponent = gameState.players[1 - playerIdx];
  const isMyTurn = gameState.currentPlayerIndex === playerIdx;
  const isGameOver = gameState.phase === 'ended';

  const pathwayInfo = PATHWAYS[player.pathway];
  const opponentPathwayInfo = PATHWAYS[opponent.pathway];
  const attackTargets = selectedAttacker ? getAttackTargets(opponent) : null;

  const clearArrowPreview = () => {
    setArrowTargetId(null);
    setArrowTargetHero(false);
  };

  const addLog = (text: string, type: BattleLogEntry['type'] = 'action') => {
    setBattleLog((prev) => [...prev.slice(-20), { id: ++logIdRef.current, text, type }]);
  };

  const handlePlayCard = (handIndex: number) => {
    if (!isMyTurn || isGameOver) return;
    performAction({ type: 'play-card', handIndex });
  };

  const playAttackAnimation = (
    attackerId: string,
    targetId: string | null,
    targetHero: 'player' | 'opponent' | null,
    cb: () => void
  ) => {
    setImpactTarget(null);
    setAttackingMinion(attackerId);
    setDamagedMinion(null);
    setDamagedHero(null);
    setShowAttackAnim(false);

    const logBefore = gameState.log.length;

    setTimeout(() => {
      if (targetId) setDamagedMinion(targetId);
      else if (targetHero) setDamagedHero(targetHero);
      setImpactTarget({ targetId, targetHero });
      setShowAttackAnim(true);

      setTimeout(() => {
        setShowAttackAnim(false);
        cb();

        setTimeout(() => {
          const latest = useGameStore.getState().gameState;
          const hadDeath = latest?.log
            .slice(logBefore)
            .some((e) => e.type === 'minion-death') ?? false;
          const clearDelay = hadDeath ? 900 : 450;

          setTimeout(() => {
            setAttackingMinion(null);
            setDamagedMinion(null);
            setDamagedHero(null);
            setImpactTarget(null);
          }, clearDelay);
        }, 80);
      }, 700);
    }, 850);
  };

  const handleMinionClick = (instanceId: string, isEnemy: boolean) => {
    if (!isMyTurn || isGameOver) return;

    if (selectedAttacker) {
      if (isEnemy) {
        const atkId = selectedAttacker;
        const action: GameAction = { type: 'attack', attackerInstanceId: atkId, targetInstanceId: instanceId };
        const err = validateAction(gameState, playerId, action);
        if (err) {
          addLog(formatAttackError(err, attackTargets ?? undefined), 'system');
          return;
        }
        const attacker = player.board.find((m) => m.instanceId === atkId);
        const target = opponent.board.find((m) => m.instanceId === instanceId);
        if (attacker && target) {
          clearArrowPreview();
          setSelectedAttacker(null);
          playAttackAnimation(atkId, instanceId, null, () => {
            performAction(action);
          });
          return;
        }
      }
      setSelectedAttacker(null);
      clearArrowPreview();
    } else if (!isEnemy) {
      const minion = player.board.find((m) => m.instanceId === instanceId);
      if (minion?.canAttack && !minion.exhausted) {
        setSelectedAttacker(instanceId);
        clearArrowPreview();
        addLog(`Selecionou ${minion.card.name} para atacar`, 'system');
      }
    }
  };

  const handleHeroClick = (isEnemy: boolean) => {
    if (!isMyTurn || isGameOver) return;

    if (selectedAttacker && isEnemy) {
      const atkId = selectedAttacker;
      const action: GameAction = { type: 'attack-hero', attackerInstanceId: atkId };
      const err = validateAction(gameState, playerId, action);
      if (err) {
        addLog(formatAttackError(err, attackTargets ?? undefined), 'system');
        return;
      }
      const attacker = player.board.find((m) => m.instanceId === atkId);
      if (attacker) {
        clearArrowPreview();
        setSelectedAttacker(null);
        playAttackAnimation(atkId, null, 'opponent', () => {
          performAction(action);
        });
        return;
      }
      setSelectedAttacker(null);
      clearArrowPreview();
    }
  };

  const handleEndTurn = () => {
    if (!isMyTurn || isGameOver) return;
    setSelectedAttacker(null);
    clearArrowPreview();
    addLog('Fim de turno', 'system');
    performAction({ type: 'end-turn' });
  };

  const handleHeroPower = () => {
    if (!isMyTurn || isGameOver || player.heroPowerUsed || player.spirituality < 2) return;
    performAction({ type: 'hero-power' });
  };

  const activeImpact = impactTarget ?? (
    pendingAttack?.phase === 'impact'
      ? { targetId: pendingAttack.targetId, targetHero: pendingAttack.targetHero }
      : null
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden select-none">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-void-900 via-void-950 to-void-900" />
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,_rgba(168,85,247,0.3)_0%,_transparent_50%)]" />

      {/* Turn banner — auto-gerenciado, aparece e some sozinho */}
      <TurnBanner turnNumber={gameState.turn} isYourTurn={isMyTurn} />

      <NpcPlayReveal cardName={npcPlayReveal?.cardName ?? null} />

      {/* Slash impact on the target card or hero */}
      <AttackImpact
        show={showAttackAnim}
        targetId={activeImpact?.targetId ?? null}
        targetHero={activeImpact?.targetHero ?? null}
      />

      {/* Attack arrow (NPC intent or player hover preview) */}
      <AttackArrow
        attackerId={
          pendingAttack?.attackerId
          ?? (selectedAttacker && (arrowTargetId || arrowTargetHero) ? selectedAttacker : null)
        }
        targetId={pendingAttack ? pendingAttack.targetId : arrowTargetHero ? null : arrowTargetId}
        targetHero={
          pendingAttack?.targetHero
          ?? (arrowTargetHero ? 'opponent' : null)
        }
        isPlayerAttacking={pendingAttack ? !pendingAttack.isNpc : true}
        phase={pendingAttack?.phase ?? 'preview'}
      />

      {/* Game over overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-center p-8 rounded-2xl bg-void-900/95 border border-void-500 shadow-2xl max-w-xs w-full mx-4"
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <motion.h2
                className="text-4xl font-display font-bold mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {gameState.winner === playerId ? (
                  <span className="text-gold-400">Vitória!</span>
                ) : gameState.winner === null ? (
                  <span className="text-void-300">Empate</span>
                ) : (
                  <span className="text-blood-500">Derrota</span>
                )}
              </motion.h2>
              <motion.p
                className="text-sm text-void-400 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {gameState.winner === playerId
                  ? 'Seu oponente foi derrotado!'
                  : gameState.winner === null
                  ? 'Ambos caíram ao mesmo tempo.'
                  : 'Sua vida chegou a zero.'}
              </motion.p>
              <motion.button
                onClick={() => { reset(); onNavigate('home'); }}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-xl font-bold transition-all shadow-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Voltar ao Menu
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col h-full">
        {/* ─── Opponent area ─────────────────────────────────────────────── */}
        <div className="flex-none p-2 pb-1">
          <div className="flex items-center gap-3">
            <div
              data-hero-enemy
              className={`relative ${attackTargets?.heroValid ? 'cursor-crosshair' : ''}`}
              onClick={() => handleHeroClick(true)}
              onMouseEnter={() => {
                if (selectedAttacker && attackTargets?.heroValid) setArrowTargetHero(true);
              }}
              onMouseLeave={() => setArrowTargetHero(false)}
            >
              {selectedAttacker && attackTargets?.heroValid && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-400/70 shadow-red-500/40 shadow-lg z-10 pointer-events-none"
                  animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              {damagedHero === 'opponent' && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-400 z-10 pointer-events-none"
                  animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.12, 1] }}
                  transition={{ duration: 0.45, repeat: 2 }}
                />
              )}
              <HeroPortrait
                health={opponent.health}
                maxHealth={opponent.maxHealth}
                pathway={opponent.pathway}
                isEnemy
                onClick={() => handleHeroClick(true)}
                hasWeapon={!!opponent.weapon}
                weaponAttack={opponent.weapon?.currentAttack}
                isBeingAttacked={damagedHero === 'opponent'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-void-200 truncate">
                {opponentPathwayInfo.name}
              </div>
              <div className="text-[10px] text-void-500 flex items-center gap-2">
                <span className={opponent.deck.length <= 5 ? 'text-red-400' : ''}>📚 {opponent.deck.length}</span>
                <span>🃏 {opponent.hand.length}</span>
                <button
                  onClick={() => setShowGraveyard(showGraveyard === 'opponent' ? null : 'opponent')}
                  className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] transition-colors ${
                    showGraveyard === 'opponent' ? 'bg-purple-800/60 text-purple-200' : 'hover:bg-void-700'
                  }`}
                >
                  💀 {opponent.graveyard.length}
                </button>
              </div>
              {/* Spirituality */}
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: Math.min(opponent.maxSpirituality, 10) }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${
                      i < opponent.spirituality ? 'bg-blue-400 shadow-blue-400/50 shadow-sm' : 'bg-void-700'
                    }`}
                    animate={i < opponent.spirituality ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ delay: i * 0.05 }}
                  />
                ))}
              </div>
            </div>
            {opponent.secrets.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gold-400/10 border border-gold-400/30 rounded-lg">
                <span className="text-xs">❓</span>
                <span className="text-[10px] text-gold-400 font-medium">
                  {opponent.secrets.length} segredo{opponent.secrets.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Enemy hand (card backs) */}
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {Array.from({ length: opponent.hand.length }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-5 h-7 rounded bg-gradient-to-b from-indigo-800 to-indigo-950 border border-indigo-500/40 shadow-sm"
                style={{ marginLeft: i > 0 ? '-4px' : 0 }}
              />
            ))}
          </div>
        </div>

        {/* ─── Opponent board ────────────────────────────────────────────── */}
        <AnimatedBoard
          minions={opponent.board}
          isEnemy
          selectedAttacker={selectedAttacker}
          validTargetIds={attackTargets?.validMinionIds ?? null}
          attackingMinion={attackingMinion}
          damagedMinion={damagedMinion}
          onMinionClick={handleMinionClick}
          onValidTargetHover={(id, hovering) => {
            if (hovering) setArrowTargetId(id);
            else setArrowTargetId(null);
          }}
        />

        {/* ─── Center divider + controls ─────────────────────────────────── */}
        <div className="flex-none flex items-center justify-center py-2 px-3">
          <div className="flex items-center gap-3 w-full max-w-sm">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-void-600" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-void-500 font-mono">T{gameState.turn}</span>

              {isMyTurn && !isGameOver && (
                <motion.button
                  onClick={handleEndTurn}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-900/30 border border-green-500/30"
                >
                  Finalizar Turno
                </motion.button>
              )}
              {!isMyTurn && !isGameOver && (
                <motion.div
                  className="px-4 py-2 bg-void-800/80 rounded-xl border border-red-700/50"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="text-xs text-red-300">
                    {npcThinking ? 'Inimigo agindo...' : 'Turno inimigo...'}
                  </span>
                </motion.div>
              )}

              {/* Battle log toggle */}
              <button
                onClick={() => setShowLog(!showLog)}
                className="w-8 h-8 rounded-full bg-void-800 border border-void-600 flex items-center justify-center text-xs hover:bg-void-700 transition-all"
                title="Log de batalha"
              >
                📜
              </button>
            </div>

            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-void-600" />
          </div>
        </div>

        {/* ─── Player board ──────────────────────────────────────────────── */}
        <AnimatedBoard
          minions={player.board}
          isEnemy={false}
          selectedAttacker={selectedAttacker}
          attackingMinion={attackingMinion}
          damagedMinion={damagedMinion}
          onMinionClick={handleMinionClick}
        />

        {/* ─── Player area ───────────────────────────────────────────────── */}
        <div className="flex-none p-2 pt-1">
          <div className="flex items-center gap-3">
            <div
              data-hero-player
              className={`relative ${damagedHero === 'player' ? 'z-20' : ''}`}
            >
              {damagedHero === 'player' && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-400 z-10 pointer-events-none"
                  animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.12, 1] }}
                  transition={{ duration: 0.45, repeat: 2 }}
                />
              )}
              <HeroPortrait
                health={player.health}
                maxHealth={player.maxHealth}
                pathway={player.pathway}
                isEnemy={false}
                onClick={() => {}}
                hasWeapon={!!player.weapon}
                weaponAttack={player.weapon?.currentAttack}
                isBeingAttacked={damagedHero === 'player'}
              />
            </div>
            <div className="flex-1 min-w-0">
              {/* Spirituality bar */}
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(player.maxSpirituality, 10) }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-3 h-3 rounded-full border ${
                      i < player.spirituality
                        ? 'bg-blue-400 border-blue-300/50 shadow-blue-400/50 shadow-sm'
                        : 'bg-void-700 border-void-600'
                    }`}
                    animate={i < player.spirituality ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ delay: i * 0.03 }}
                  />
                ))}
              </div>
              <div className="text-[10px] text-void-400 mt-0.5 flex items-center gap-2">
                <span><span className="text-blue-300 font-bold">{player.spirituality}</span>/{player.maxSpirituality}</span>
                {/* Deck indicator */}
                {player.deck.length > 0 ? (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                    player.deck.length <= 5 ? 'bg-red-900/40 text-red-300' :
                    player.deck.length <= 10 ? 'bg-yellow-900/30 text-yellow-300' :
                    'bg-void-800 text-void-300'
                  }`}>
                    📚 {player.deck.length}
                  </span>
                ) : (
                  <motion.span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-900/60 text-red-200"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ⚠️ Fatigue {player.fatigueDamage > 0 ? `(-${player.fatigueDamage + 1})` : ''}
                  </motion.span>
                )}
                {/* Graveyard indicator */}
                <button
                  onClick={() => setShowGraveyard(showGraveyard === 'player' ? null : 'player')}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors ${
                    showGraveyard === 'player' ? 'bg-purple-800/60 text-purple-200' : 'bg-void-800 text-void-400 hover:bg-void-700'
                  }`}
                >
                  💀 {player.graveyard.length}
                </button>
              </div>
            </div>

            {/* Hero power */}
            <motion.button
              onClick={handleHeroPower}
              disabled={!isMyTurn || player.heroPowerUsed || player.spirituality < 2}
              whileHover={isMyTurn && !player.heroPowerUsed ? { scale: 1.05 } : undefined}
              whileTap={isMyTurn && !player.heroPowerUsed ? { scale: 0.95 } : undefined}
              className={`relative px-3 py-2 rounded-xl text-[10px] font-medium border transition-all group ${
                isMyTurn && !player.heroPowerUsed && player.spirituality >= 2
                  ? 'border-purple-400/60 bg-purple-900/50 text-purple-200 hover:bg-purple-800/60'
                  : 'border-void-700 bg-void-900/50 text-void-500 cursor-not-allowed'
              }`}
              title={`${pathwayInfo.powerName}: ${pathwayInfo.powerDescription}`}
            >
              <div className="font-bold text-[11px]">{pathwayInfo.powerName}</div>
              <div className="text-[8px] text-void-400">Custo: 2</div>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-void-900/95 border border-void-500 rounded-lg p-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="text-[9px] text-void-200">{pathwayInfo.powerDescription}</p>
              </div>
            </motion.button>

            {/* Fate coin */}
            {player.hasFateCoin && (
              <motion.button
                onClick={() => { addLog('Usou Fate Coin (+1 Spirituality)', 'action'); performAction({ type: 'use-fate-coin' }); }}
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-yellow-700 flex items-center justify-center text-sm font-bold shadow-lg border border-yellow-300/30"
                title="Fate Coin: +1 Spirituality neste turno"
              >
                🪙
              </motion.button>
            )}
          </div>
        </div>

        {/* ─── Hand ──────────────────────────────────────────────────────── */}
        <div className="flex-none h-36 relative">
          <div className="absolute bottom-0 inset-x-0 flex items-end justify-center pb-2 px-1">
            <div className="flex gap-1 max-w-full px-2">
              <AnimatePresence mode="popLayout">
                {player.hand.map((card, index) => (
                  <motion.div
                    key={`${card.id}-${index}`}
                    layout
                    initial={{ scale: 0.5, y: 60, opacity: 0, rotate: -5 }}
                    animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="relative hover:z-50"
                  >
                    <CardComponent
                      card={card}
                      canPlay={isMyTurn && card.cost <= player.spirituality && !isGameOver}
                      onClick={() => handlePlayCard(index)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Battle Log Sidebar ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-52 bg-void-950/95 border-l border-void-700 z-30 flex flex-col"
            initial={{ x: 200 }}
            animate={{ x: 0 }}
            exit={{ x: 200 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between p-3 border-b border-void-700">
              <h4 className="text-xs font-bold text-void-200">Log de Batalha</h4>
              <button onClick={() => setShowLog(false)} className="text-void-500 hover:text-void-200 text-xs">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {battleLog.length === 0 && (
                <p className="text-[10px] text-void-600 text-center mt-4">Nenhuma ação ainda</p>
              )}
              {battleLog.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-[10px] py-1 px-2 rounded ${
                    entry.type === 'enemy' ? 'bg-red-950/60 text-red-200 border border-red-800/40' :
                    entry.type === 'damage' ? 'bg-red-900/30 text-red-300' :
                    entry.type === 'system' ? 'text-void-500' :
                    entry.type === 'reward' ? 'bg-gold-400/10 text-gold-400' :
                    'text-void-300'
                  }`}
                >
                  {entry.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Graveyard Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showGraveyard && (
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-56 bg-void-950/95 border-r border-void-700 z-30 flex flex-col"
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between p-3 border-b border-void-700">
              <h4 className="text-xs font-bold text-void-200">
                💀 Cemitério {showGraveyard === 'player' ? '(Seu)' : '(Inimigo)'}
              </h4>
              <button onClick={() => setShowGraveyard(null)} className="text-void-500 hover:text-void-200 text-xs">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {(() => {
                const graveyard = showGraveyard === 'player' ? player.graveyard : opponent.graveyard;
                if (graveyard.length === 0) {
                  return <p className="text-[10px] text-void-600 text-center mt-4">Cemitério vazio</p>;
                }
                return (
                  <div className="space-y-1">
                    {graveyard.map((card, i) => (
                      <button
                        key={`${card.id}-${i}`}
                        onClick={() => setGraveyardDetail(card)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-void-800/60 border border-void-700 hover:bg-void-700/80 hover:border-void-500 transition-colors text-left"
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                          {card.cost}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-void-200 truncate">{card.name}</p>
                          <p className="text-[8px] text-void-500 capitalize">{card.type.replace('-', ' ')} • {card.rarity}</p>
                        </div>
                        {card.type === 'beyonder' && (
                          <div className="flex gap-1 text-[8px] flex-shrink-0">
                            <span className="text-yellow-400">{(card as any).attack}</span>
                            <span className="text-void-600">/</span>
                            <span className="text-red-400">{(card as any).health}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Card detail popup inside graveyard */}
              <AnimatePresence>
                {graveyardDetail && (
                  <motion.div
                    className="absolute inset-0 z-10 bg-void-950/95 flex flex-col"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="flex items-center justify-between p-3 border-b border-void-700">
                      <button onClick={() => setGraveyardDetail(null)} className="text-[10px] text-void-400 hover:text-void-200">
                        ← Voltar
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <h3 className="text-sm font-bold text-white mb-1">{graveyardDetail.name}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 font-bold">
                          Custo: {graveyardDetail.cost}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${
                          graveyardDetail.rarity === 'legendary' ? 'bg-yellow-900/50 text-yellow-300' :
                          graveyardDetail.rarity === 'epic' ? 'bg-purple-900/50 text-purple-300' :
                          graveyardDetail.rarity === 'rare' ? 'bg-blue-900/50 text-blue-300' :
                          'bg-void-700 text-void-300'
                        }`}>
                          {graveyardDetail.rarity}
                        </span>
                      </div>
                      <p className="text-[10px] text-void-400 uppercase mb-2">
                        {graveyardDetail.type.replace('-', ' ')} • {graveyardDetail.pathway}
                      </p>
                      <p className="text-xs text-void-200 leading-relaxed mb-3">
                        {graveyardDetail.description || 'Sem efeito especial.'}
                      </p>
                      {graveyardDetail.keywords && graveyardDetail.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {graveyardDetail.keywords.map((kw) => (
                            <span key={kw} className="px-2 py-0.5 bg-purple-900/50 border border-purple-500/30 rounded text-[9px] text-purple-200 capitalize">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      {graveyardDetail.type === 'beyonder' && (
                        <div className="flex gap-4 text-xs mt-2">
                          <span className="text-yellow-400 font-semibold">⚔️ {(graveyardDetail as any).attack}</span>
                          <span className="text-red-400 font-semibold">❤️ {(graveyardDetail as any).health}</span>
                        </div>
                      )}
                      {graveyardDetail.type === 'sealed-artifact' && (
                        <div className="flex gap-4 text-xs mt-2">
                          <span className="text-yellow-400 font-semibold">⚔️ {(graveyardDetail as any).attack}</span>
                          <span className="text-green-400 font-semibold">🛡️ {(graveyardDetail as any).durability}</span>
                        </div>
                      )}
                      {graveyardDetail.flavorText && (
                        <p className="text-[10px] text-void-500 italic mt-3">"{graveyardDetail.flavorText}"</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-none p-2 border-t border-void-700 text-center">
              <span className="text-[9px] text-void-500">{(showGraveyard === 'player' ? player.graveyard : opponent.graveyard).length} carta(s)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Targeting hint ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAttacker && (
          <motion.div
            className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="bg-void-900/90 border border-green-500/40 rounded-xl px-4 py-2 shadow-lg backdrop-blur-sm">
              <p className="text-xs text-green-300 text-center">
                {attackTargets?.hasProvoke
                  ? `Provoke: ataque ${attackTargets.provokeNames.join(', ')} primeiro`
                  : 'Selecione um alvo inimigo para atacar'}
              </p>
              <p className="text-[9px] text-void-500 text-center mt-0.5">
                {attackTargets?.hasProvoke
                  ? 'Minions com 🛡️ bloqueiam ataques ao herói'
                  : 'Toque em um minion ou no herói inimigo'}
              </p>
              <button
                onClick={() => { setSelectedAttacker(null); clearArrowPreview(); }}
                className="mt-1.5 w-full text-[10px] text-void-400 hover:text-void-200 text-center"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
