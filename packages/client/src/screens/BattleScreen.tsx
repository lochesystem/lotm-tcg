import { Screen } from '../App';
import { useGameStore, type PendingAttack, type PendingRitual } from '../stores/gameStore';
import { CardComponent } from '../components/Card';
import { AnimatedBoard } from '../components/AnimatedBoard';
import { HeroPortrait } from '../components/HeroPortrait';
import { TurnBanner } from '../components/TurnBanner';
import { StoryIntroBanner } from '../components/StoryIntroBanner';
import { AnchorTooltip } from '../components/AnchorTooltip';
import { AttackImpact } from '../components/AttackImpact';
import { AttackArrow } from '../components/AttackArrow';
import { AttackTargetArrows } from '../components/AttackTargetArrows';
import { HeroPowerBeam } from '../components/HeroPowerBeam';
import { HeroPowerImpact } from '../components/HeroPowerImpact';
import { RitualEffect } from '../components/RitualEffect';
import { NpcPlayReveal } from '../components/NpcPlayReveal';
import { PackOpening } from '../components/PackOpening';
import { GameAction, validateAction, openPack, getPackTypeForReward, PackResult, PATHWAYS, type Pathway } from 'game-engine';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAttackTargets, formatAttackError } from '../utils/combatTargets';
import {
  getHeroPowerTargetMode,
  getHeroPowerEnemyMinionTargets,
  getHeroPowerFriendlyMinionTargets,
  heroPowerAllowsEnemyHero,
  heroPowerAllowsFriendlyHero,
  isValidHeroPowerTarget,
  resolveHeroPowerTargetId,
} from '../utils/heroPowerTargeting';
import { cardNeedsTarget, getCardPlayTargets, isValidCardTarget } from '../utils/cardTargeting';
import {
  isDamagingRitual,
  isAoERitual,
  isFullBoardRitual,
  ritualPathway,
  resolveRitualTargets,
} from '../utils/ritualTargets';
import { getKeywordInfo } from '../components/KeywordTooltip';
import type { Keyword } from 'game-engine';
import { formatGameEvent } from '../utils/battleLog';
import { useCollectionStore } from '../stores/collectionStore';
import { getCurrentUserId } from '../lib/sessionContext';
import { recordMatch } from '../sync/player-sync';

interface Props {
  onNavigate: (screen: Screen) => void;
}

interface BattleLogEntry {
  id: number;
  text: string;
  type: 'action' | 'damage' | 'system' | 'reward' | 'enemy';
}

const PLAYER_RITUAL_TIMING = {
  preview: 800,
  charge: 650,
  impact: 750,
  post: 450,
} as const;

const REMOTE_ATTACK_TIMING = {
  preview: 2000,
  strike: 1000,
  impact: 800,
  post: 600,
} as const;

export function BattleScreen({ onNavigate }: Props) {
  const { gameState, playerId, opponentId, performAction, reset, npcThinking, pendingAttack, pendingHeroPower, pendingRitual, npcPlayReveal, npcTier, isOnline, isStoryMode, storyOpponentPathway } = useGameStore();
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [targetingHandIndex, setTargetingHandIndex] = useState<number | null>(null);
  const [hoveredHandIndex, setHoveredHandIndex] = useState<number | null>(null);
  const [hoveredKeyword, setHoveredKeyword] = useState<Keyword | null>(null);
  const [showAttackAnim, setShowAttackAnim] = useState(false);
  const [showHeroPowerAnim, setShowHeroPowerAnim] = useState(false);
  const [showRitualAnim, setShowRitualAnim] = useState(false);
  const [playerRitual, setPlayerRitual] = useState<PendingRitual | null>(null);
  const ritualTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [ritualTargetIds, setRitualTargetIds] = useState<Set<string> | null>(null);
  const [ritualDamagedIds, setRitualDamagedIds] = useState<Set<string> | null>(null);
  const [castingHero, setCastingHero] = useState<'player' | 'opponent' | null>(null);
  const [attackingMinion, setAttackingMinion] = useState<string | null>(null);
  const [damagedMinion, setDamagedMinion] = useState<string | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [showGraveyard, setShowGraveyard] = useState<'player' | 'opponent' | null>(null);
  const [graveyardDetail, setGraveyardDetail] = useState<import('game-engine').Card | null>(null);
  const [arrowTargetId, setArrowTargetId] = useState<string | null>(null);
  const [arrowTargetHero, setArrowTargetHero] = useState(false);
  const [remoteOpponentAttack, setRemoteOpponentAttack] = useState<PendingAttack | null>(null);
  const [damagedHero, setDamagedHero] = useState<'player' | 'opponent' | null>(null);
  const [impactTarget, setImpactTarget] = useState<{
    targetId: string | null;
    targetHero: 'player' | 'opponent' | null;
  } | null>(null);
  const [heroPowerImpactTarget, setHeroPowerImpactTarget] = useState<{
    targetId: string | null;
    targetHero: 'player' | 'opponent' | null;
  } | null>(null);
  const logIdRef = useRef(0);
  const processedLogRef = useRef(0);
  const processedAttackAnimRef = useRef(0);
  const remoteAttackQueueRef = useRef<Omit<PendingAttack, 'phase' | 'isNpc'>[]>([]);
  const remoteAttackPlayingRef = useRef(false);
  const rewardGrantedRef = useRef(false);
  const heroPowerBtnRef = useRef<HTMLButtonElement>(null);
  const [heroPowerHover, setHeroPowerHover] = useState(false);
  const [rewardPack, setRewardPack] = useState<PackResult | null>(null);
  const [unlockedPathway, setUnlockedPathway] = useState<Pathway | null>(null);
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
  const [targetingHeroPower, setTargetingHeroPower] = useState(false);
  const [weaponAttackMode, setWeaponAttackMode] = useState(false);
  const recordNpcWin = useCollectionStore((s) => s.recordNpcWin);
  const recordStoryWin = useCollectionStore((s) => s.recordStoryWin);
  const recordNpcLoss = useCollectionStore((s) => s.recordNpcLoss);

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

  // Online PvP: replay opponent attack animations from the authoritative log
  useEffect(() => {
    if (!isOnline || !gameState) return;

    const newEvents = gameState.log.slice(processedAttackAnimRef.current);
    processedAttackAnimRef.current = gameState.log.length;
    if (newEvents.length === 0) return;

    for (const event of newEvents) {
      if (event.playerId !== opponentId) continue;
      if (event.type === 'attack') {
        remoteAttackQueueRef.current.push({
          attackerId: event.data.attacker as string,
          targetId: event.data.target as string,
          targetHero: null,
        });
      } else if (event.type === 'attack-hero') {
        remoteAttackQueueRef.current.push({
          attackerId: event.data.attacker as string,
          targetId: null,
          targetHero: 'player',
        });
      }
    }

    if (!remoteAttackPlayingRef.current && remoteAttackQueueRef.current.length > 0) {
      remoteAttackPlayingRef.current = true;

      const runQueue = async () => {
        const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

        while (remoteAttackQueueRef.current.length > 0) {
          const next = remoteAttackQueueRef.current.shift();
          if (!next) break;

          const base: PendingAttack = { ...next, isNpc: true, phase: 'preview' };
          setRemoteOpponentAttack({ ...base, phase: 'preview' });
          await wait(REMOTE_ATTACK_TIMING.preview);
          setRemoteOpponentAttack({ ...base, phase: 'strike' });
          await wait(REMOTE_ATTACK_TIMING.strike);
          setRemoteOpponentAttack({ ...base, phase: 'impact' });
          await wait(REMOTE_ATTACK_TIMING.impact);
          setRemoteOpponentAttack(null);
          await wait(REMOTE_ATTACK_TIMING.post);
        }

        remoteAttackPlayingRef.current = false;
      };

      void runQueue();
    }
  }, [gameState, gameState?.log.length, isOnline, opponentId]);

  useEffect(() => {
    processedLogRef.current = 0;
    processedAttackAnimRef.current = 0;
    remoteAttackQueueRef.current = [];
    remoteAttackPlayingRef.current = false;
    setRemoteOpponentAttack(null);
    setBattleLog([]);
    logIdRef.current = 0;
    rewardGrantedRef.current = false;
    setRewardPack(null);
    setUnlockedPathway(null);
    setTargetingHeroPower(false);
    setWeaponAttackMode(false);
    setSelectedHandIndex(null);
    setTargetingHandIndex(null);
    setHoveredHandIndex(null);
    setHoveredKeyword(null);
  }, [gameState?.id]);

  // Grant booster pack reward after local NPC victory
  useEffect(() => {
    if (!gameState || gameState.phase !== 'ended' || rewardGrantedRef.current || isOnline) return;

    const isNpcMatch = opponentId === 'npc-1' || gameState.players.some((p) => p.id === 'npc-1');
    if (!isNpcMatch) return;

    rewardGrantedRef.current = true;

    const finishMatch = async () => {
      const userId = getCurrentUserId();
      const turns = gameState.turn;

      if (gameState.winner === playerId) {
        let streak: number;
        if (isStoryMode) {
          const storyResult = await recordStoryWin();
          streak = storyResult.streak;
          if (storyResult.unlockedPathway) {
            setUnlockedPathway(storyResult.unlockedPathway);
          }
        } else {
          streak = await recordNpcWin();
        }
        const packType = getPackTypeForReward(npcTier, streak);
        setRewardPack(openPack(packType, Date.now()));
        if (userId) {
          await recordMatch(userId, {
            opponentType: 'npc',
            npcTier,
            won: true,
            durationTurns: turns,
          });
        }
      } else if (gameState.winner && gameState.winner !== playerId) {
        await recordNpcLoss();
        if (userId) {
          await recordMatch(userId, {
            opponentType: 'npc',
            npcTier,
            won: false,
            durationTurns: turns,
          });
        }
      } else if (gameState.winner === null && userId) {
        await recordMatch(userId, {
          opponentType: 'npc',
          npcTier,
          won: false,
          isDraw: true,
          durationTurns: turns,
        });
      }
    };

    void finishMatch();
  }, [gameState, gameState?.phase, gameState?.winner, gameState?.turn, playerId, opponentId, isOnline, isStoryMode, npcTier, recordNpcWin, recordStoryWin, recordNpcLoss]);

  // Sync enemy attack animation phases (NPC or online opponent)
  const activeEnemyAttack = pendingAttack?.isNpc ? pendingAttack : remoteOpponentAttack;

  useEffect(() => {
    if (!activeEnemyAttack) return;

    const { phase, attackerId, targetId, targetHero } = activeEnemyAttack;

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
  }, [activeEnemyAttack]);

  // Sync NPC hero power animation phases from store
  useEffect(() => {
    if (!pendingHeroPower?.isNpc) return;

    const { phase, targetId, targetHero } = pendingHeroPower;
    const sourceHero = pendingHeroPower.isNpc ? 'opponent' : 'player';

    if (phase === 'preview') {
      setCastingHero(sourceHero);
      setDamagedMinion(null);
      setDamagedHero(null);
      setHeroPowerImpactTarget(null);
      setShowHeroPowerAnim(false);
      return;
    }

    if (phase === 'strike') {
      setCastingHero(sourceHero);
      setDamagedMinion(null);
      setDamagedHero(null);
      setHeroPowerImpactTarget(null);
      setShowHeroPowerAnim(false);
      return;
    }

    // impact
    setCastingHero(sourceHero);
    if (targetId) {
      setDamagedMinion(targetId);
      setDamagedHero(null);
    } else if (targetHero) {
      setDamagedMinion(null);
      setDamagedHero(targetHero);
    }
    setHeroPowerImpactTarget({ targetId, targetHero });
    setShowHeroPowerAnim(true);
    const timer = setTimeout(() => setShowHeroPowerAnim(false), 550);
    return () => clearTimeout(timer);
  }, [pendingHeroPower]);

  // Sync NPC ritual animation phases from store
  useEffect(() => {
    if (!pendingRitual?.isNpc) return;

    const { phase, targetIds, targetHero } = pendingRitual;

    if (phase === 'preview') {
      setRitualTargetIds(new Set(targetIds));
      setRitualDamagedIds(null);
      setDamagedMinion(null);
      setDamagedHero(null);
      setShowRitualAnim(false);
      return;
    }

    if (phase === 'strike') {
      setRitualTargetIds(new Set(targetIds));
      setRitualDamagedIds(null);
      setDamagedMinion(null);
      setDamagedHero(null);
      setShowRitualAnim(false);
      return;
    }

    // impact
    setRitualTargetIds(new Set(targetIds));
    setRitualDamagedIds(new Set(targetIds));
    if (targetIds.length === 1) {
      setDamagedMinion(targetIds[0]);
      setDamagedHero(null);
    } else if (targetHero) {
      setDamagedMinion(null);
      setDamagedHero(targetHero);
    } else {
      setDamagedMinion(null);
      setDamagedHero(null);
    }
    setShowRitualAnim(true);
    const timer = setTimeout(() => setShowRitualAnim(false), 600);
    return () => clearTimeout(timer);
  }, [pendingRitual]);

  useEffect(() => {
    if (!pendingHeroPower) {
      const timer = setTimeout(() => {
        setCastingHero(null);
        if (!activeEnemyAttack) {
          setDamagedMinion(null);
          setDamagedHero(null);
        }
        setHeroPowerImpactTarget(null);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [pendingHeroPower, activeEnemyAttack]);

  useEffect(() => {
    if (!pendingRitual && !playerRitual) {
      const timer = setTimeout(() => {
        setRitualTargetIds(null);
        setRitualDamagedIds(null);
        if (!activeEnemyAttack && !pendingHeroPower) {
          setDamagedMinion(null);
          setDamagedHero(null);
        }
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [pendingRitual, playerRitual, activeEnemyAttack, pendingHeroPower]);

  useEffect(() => () => {
    for (const timer of ritualTimersRef.current) clearTimeout(timer);
    ritualTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (!activeEnemyAttack) {
      const timer = setTimeout(() => {
        setAttackingMinion(null);
        if (!pendingHeroPower && !pendingRitual) {
          setDamagedMinion(null);
          setDamagedHero(null);
        }
        setImpactTarget(null);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [activeEnemyAttack, pendingHeroPower, pendingRitual, playerRitual]);

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
  const playerConceded = gameState.log.some((e) => e.type === 'concede' && e.playerId === playerId);

  const handleConcede = () => {
    if (isGameOver) return;
    const err = validateAction(gameState, playerId, { type: 'concede' });
    if (err) {
      addLog(err, 'system');
      return;
    }
    setShowConcedeConfirm(false);
    performAction({ type: 'concede' });
    addLog('Você desistiu da partida', 'system');
    clearCardSelection();
    setSelectedAttacker(null);
    clearArrowPreview();
  };

  const pathwayInfo = PATHWAYS[player.pathway];
  const opponentPathwayInfo = PATHWAYS[opponent.pathway];
  const attackTargets = selectedAttacker ? getAttackTargets(opponent) : null;
  const weaponTargets = weaponAttackMode ? getAttackTargets(opponent) : null;
  const heroPowerMode = targetingHeroPower ? getHeroPowerTargetMode(player.pathway) : null;
  const targetingCard = targetingHandIndex !== null ? player.hand[targetingHandIndex] : null;
  const playTargets = targetingCard ? getCardPlayTargets(targetingCard, player, opponent) : null;
  const opponentBoardTargets = targetingHandIndex !== null
    ? playTargets?.enemyMinionIds ?? null
    : weaponAttackMode
      ? weaponTargets?.validMinionIds ?? null
      : heroPowerMode
        ? getHeroPowerEnemyMinionTargets(heroPowerMode, opponent)
        : attackTargets?.validMinionIds ?? null;
  const playerBoardTargets = targetingHandIndex !== null
    ? playTargets?.friendlyMinionIds ?? null
    : heroPowerMode
      ? getHeroPowerFriendlyMinionTargets(heroPowerMode, player)
      : null;

  const previewHandIndex =
    targetingHandIndex ?? selectedHandIndex ?? hoveredHandIndex;

  const previewCard =
    previewHandIndex !== null ? player.hand[previewHandIndex] : null;

  const clearArrowPreview = () => {
    setArrowTargetId(null);
    setArrowTargetHero(false);
  };

  const addLog = (text: string, type: BattleLogEntry['type'] = 'action') => {
    setBattleLog((prev) => [...prev.slice(-20), { id: ++logIdRef.current, text, type }]);
  };

  const clearActionModes = () => {
    clearCardSelection();
    setSelectedAttacker(null);
    setTargetingHeroPower(false);
    setWeaponAttackMode(false);
    clearArrowPreview();
  };

  const executeHeroPower = (target?: string) => {
    const action: GameAction = { type: 'hero-power', target };
    const err = validateAction(gameState, playerId, action);
    if (err) {
      addLog(err, 'system');
      return;
    }
    const buffedMinion = target ? player.board.find((m) => m.instanceId === target) : null;
    performAction(action);
    if (player.pathway === 'tyrant' && buffedMinion) {
      addLog(`Tempest: ${buffedMinion.card.name} +1 Ataque neste turno`, 'action');
    } else {
      addLog(`Usou ${pathwayInfo.powerName}`, 'action');
    }
    setTargetingHeroPower(false);
    setWeaponAttackMode(false);
  };

  const handlePlayCard = (handIndex: number) => {
    if (!isMyTurn || isGameOver) return;
    performAction({ type: 'play-card', handIndex });
  };

  const clearCardSelection = () => {
    setSelectedHandIndex(null);
    setTargetingHandIndex(null);
    setHoveredHandIndex(null);
    setHoveredKeyword(null);
  };

  const clearRitualTimers = () => {
    for (const timer of ritualTimersRef.current) clearTimeout(timer);
    ritualTimersRef.current = [];
  };

  const scheduleRitualPhase = (fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay);
    ritualTimersRef.current.push(timer);
  };

  const playRitualAnimation = (
    handIndex: number,
    target: string | undefined,
    cardName: string
  ) => {
    const card = player.hand[handIndex];
    if (!card || !isDamagingRitual(card)) return;

    const { targetIds, targetHero } = resolveRitualTargets(
      gameState,
      playerId,
      card.effect,
      target
    );
    const ritualBase: PendingRitual = {
      cardName: card.name,
      pathway: ritualPathway(card),
      targetIds,
      targetHero,
      isAoE: isAoERitual(card.effect),
      fullBoard: isFullBoardRitual(card.effect),
      isNpc: false,
      phase: 'preview',
    };

    clearRitualTimers();
    clearCardSelection();
    setSelectedAttacker(null);
    clearArrowPreview();
    setRitualTargetIds(new Set(targetIds));
    setRitualDamagedIds(null);
    setDamagedMinion(null);
    setDamagedHero(null);
    setShowRitualAnim(false);
    setPlayerRitual(ritualBase);
    addLog(`Lançou ${cardName}`, 'action');

    scheduleRitualPhase(() => {
      setPlayerRitual({ ...ritualBase, phase: 'strike' });
    }, PLAYER_RITUAL_TIMING.preview);

    scheduleRitualPhase(() => {
      setPlayerRitual({ ...ritualBase, phase: 'impact' });
      setRitualDamagedIds(targetIds.length > 0 ? new Set(targetIds) : null);
      if (targetIds.length === 1) {
        setDamagedMinion(targetIds[0]);
        setDamagedHero(null);
      } else if (targetHero) {
        setDamagedMinion(null);
        setDamagedHero(targetHero);
      }
      setShowRitualAnim(true);

      const action: GameAction = { type: 'play-card', handIndex, target };
      performAction(action);
    }, PLAYER_RITUAL_TIMING.preview + PLAYER_RITUAL_TIMING.charge);

    scheduleRitualPhase(() => {
      setShowRitualAnim(false);
      setPlayerRitual(null);
      setRitualTargetIds(null);
      setRitualDamagedIds(null);
      setDamagedMinion(null);
      setDamagedHero(null);
    }, PLAYER_RITUAL_TIMING.preview + PLAYER_RITUAL_TIMING.charge + PLAYER_RITUAL_TIMING.impact + PLAYER_RITUAL_TIMING.post);
  };

  const executePlayCard = (handIndex: number, target?: string) => {
    const action: GameAction = { type: 'play-card', handIndex, target };
    const err = validateAction(gameState, playerId, action);
    if (err) {
      addLog(err, 'system');
      return;
    }
    const cardName = player.hand[handIndex]?.name ?? 'carta';
    const card = player.hand[handIndex];

    if (card && isDamagingRitual(card)) {
      playRitualAnimation(handIndex, target, cardName);
      return;
    }

    performAction(action);
    if (card?.type === 'sealed-artifact') {
      addLog(`Equipou ${cardName} — toque ⚔️ ou no herói para atacar`, 'action');
    } else {
      addLog(`Jogou ${cardName}`, 'action');
    }
    clearCardSelection();
    setSelectedAttacker(null);
    clearArrowPreview();
  };

  const handleHandCardClick = (index: number) => {
    const card = player.hand[index];
    if (!card) return;

    if (!isMyTurn || isGameOver) {
      setSelectedHandIndex((current) => (current === index ? null : index));
      setTargetingHandIndex(null);
      return;
    }

    const playable = card.cost <= player.spirituality;

    if (targetingHandIndex !== null && targetingHandIndex !== index) {
      setTargetingHandIndex(null);
    }

    if (targetingHandIndex === index) {
      setTargetingHandIndex(null);
      addLog('Seleção de alvo cancelada', 'system');
      return;
    }

    if (selectedHandIndex !== index) {
      setSelectedHandIndex(index);
      setSelectedAttacker(null);
      clearArrowPreview();
      return;
    }

    if (!playable) return;

    if (card.type === 'beyonder' && player.board.length >= 7) {
      addLog('Tabuleiro cheio', 'system');
      return;
    }
    if (card.type === 'mystical-item' && player.secrets.length >= 3) {
      addLog('Máximo de segredos atingido', 'system');
      return;
    }

    if (cardNeedsTarget(card)) {
      const targets = getCardPlayTargets(card, player, opponent);
      if (!targets.hasAny) {
        addLog('Sem alvos válidos para esta carta', 'system');
        return;
      }
      setTargetingHandIndex(index);
      setSelectedAttacker(null);
      clearArrowPreview();
      addLog(`Escolha o alvo para ${card.name}`, 'system');
      return;
    }

    executePlayCard(index);
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

  const startWeaponAttack = () => {
    clearCardSelection();
    setSelectedAttacker(null);
    setTargetingHeroPower(false);
    setWeaponAttackMode(true);
    const weaponName = player.weapon?.card.name ?? 'Arma';
    addLog(`${weaponName} (${player.weapon?.currentAttack} atk) — escolha um alvo inimigo`, 'system');
  };

  const handleMinionClick = (instanceId: string, isEnemy: boolean) => {
    if (!isMyTurn || isGameOver) return;

    if (targetingHeroPower && heroPowerMode) {
      if (isValidHeroPowerTarget(heroPowerMode, isEnemy, instanceId, player, opponent)) {
        const target = resolveHeroPowerTargetId(
          heroPowerMode,
          isEnemy,
          instanceId,
          playerId,
          opponentId
        );
        executeHeroPower(target);
      } else if (!isEnemy && heroPowerMode === 'friendly-minion') {
        addLog('Tempest: escolha um minion no seu campo', 'system');
      } else {
        addLog('Alvo inválido para o poder', 'system');
      }
      return;
    }

    if (weaponAttackMode && isEnemy) {
      const action: GameAction = { type: 'hero-attack', targetInstanceId: instanceId };
      const err = validateAction(gameState, playerId, action);
      if (err) {
        addLog(formatAttackError(err, weaponTargets ?? undefined), 'system');
        return;
      }
      setWeaponAttackMode(false);
      performAction(action);
      addLog('Atacou com a arma equipada', 'action');
      return;
    }

    if (targetingHandIndex !== null) {
      const card = player.hand[targetingHandIndex];
      if (!card) return;
      const targets = getCardPlayTargets(card, player, opponent);
      if (isValidCardTarget(targets, instanceId, isEnemy)) {
        executePlayCard(targetingHandIndex, instanceId);
      } else {
        addLog('Alvo inválido', 'system');
      }
      return;
    }

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

    if (targetingHeroPower && heroPowerMode) {
      if (!isEnemy && heroPowerMode === 'friendly-minion') {
        if (player.board.length === 0) {
          addLog('Tempest: você precisa de um minion aliado no campo', 'system');
        } else {
          addLog('Tempest: clique em um minion aliado (não no herói)', 'system');
        }
        return;
      }
      if (isValidHeroPowerTarget(heroPowerMode, isEnemy, null, player, opponent)) {
        const target = resolveHeroPowerTargetId(
          heroPowerMode,
          isEnemy,
          null,
          playerId,
          opponentId
        );
        executeHeroPower(target);
      } else {
        addLog('Alvo inválido para o poder', 'system');
      }
      return;
    }

    if (!isEnemy && player.weapon && !targetingHandIndex && !targetingHeroPower) {
      if (weaponAttackMode) {
        setWeaponAttackMode(false);
        addLog('Ataque com arma cancelado', 'system');
      } else {
        startWeaponAttack();
      }
      return;
    }

    if (weaponAttackMode && isEnemy) {
      const action: GameAction = { type: 'hero-attack' };
      const err = validateAction(gameState, playerId, action);
      if (err) {
        addLog(formatAttackError(err, weaponTargets ?? undefined), 'system');
        return;
      }
      setWeaponAttackMode(false);
      performAction(action);
      addLog('Atacou o herói inimigo com a arma', 'action');
      return;
    }

    if (targetingHandIndex !== null) {
      const card = player.hand[targetingHandIndex];
      if (!card) return;
      const targets = getCardPlayTargets(card, player, opponent);
      if (isEnemy && targets.allowEnemyHero) {
        executePlayCard(targetingHandIndex, opponent.id);
      } else if (!isEnemy && targets.allowFriendlyHero) {
        executePlayCard(targetingHandIndex, player.id);
      } else {
        addLog('Alvo inválido', 'system');
      }
      return;
    }

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
    clearActionModes();
    addLog('Fim de turno', 'system');
    performAction({ type: 'end-turn' });
  };

  const handleHeroPower = () => {
    if (!isMyTurn || isGameOver || player.heroPowerUsed || player.spirituality < 2) return;
    if (targetingHeroPower) {
      setTargetingHeroPower(false);
      return;
    }
    const mode = getHeroPowerTargetMode(player.pathway);
    if (mode === 'none') {
      executeHeroPower();
      return;
    }
    setWeaponAttackMode(false);
    setSelectedAttacker(null);
    clearCardSelection();
    setTargetingHeroPower(true);
    if (mode === 'friendly-minion') {
      addLog(
        player.board.length > 0
          ? 'Tempest: clique em um minion aliado no seu campo'
          : 'Tempest: você precisa de um minion aliado no campo',
        'system'
      );
    } else {
      addLog(`Escolha o alvo para ${pathwayInfo.powerName}`, 'system');
    }
  };

  const activeImpact = impactTarget ?? (
    activeEnemyAttack?.phase === 'impact'
      ? { targetId: activeEnemyAttack.targetId, targetHero: activeEnemyAttack.targetHero }
      : null
  );

  const activeHeroPowerImpact = heroPowerImpactTarget ?? (
    pendingHeroPower?.phase === 'impact'
      ? { targetId: pendingHeroPower.targetId, targetHero: pendingHeroPower.targetHero }
      : null
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden select-none">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-void-900 via-void-950 to-void-900" />
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,_rgba(168,85,247,0.3)_0%,_transparent_50%)]" />

      {/* Turn banner — auto-gerenciado, aparece e some sozinho */}
      <TurnBanner turnNumber={gameState.turn} isYourTurn={isMyTurn} />

      {isStoryMode && storyOpponentPathway && (
        <StoryIntroBanner matchId={gameState.id} pathway={storyOpponentPathway} />
      )}

      {!isGameOver && (
        <button
          type="button"
          onClick={() => setShowConcedeConfirm(true)}
          className="absolute top-2 right-2 z-40 px-2.5 py-1 text-[10px] font-semibold text-red-400/90 hover:text-red-300 border border-red-900/50 hover:border-red-700/60 rounded-lg bg-void-950/80 backdrop-blur-sm transition-colors"
        >
          Desistir
        </button>
      )}

      <AnimatePresence>
        {showConcedeConfirm && (
          <motion.div
            className="absolute inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConcedeConfirm(false)}
          >
            <motion.div
              className="bg-void-900 border border-void-600 rounded-2xl p-5 max-w-xs w-full shadow-2xl"
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-white mb-1">Desistir da partida?</h3>
              <p className="text-xs text-void-400 mb-4">
                Você perderá esta partida{isStoryMode ? ' e não avançará no modo história' : ''}.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConcedeConfirm(false)}
                  className="flex-1 py-2 rounded-lg bg-void-800 hover:bg-void-700 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConcede}
                  className="flex-1 py-2 rounded-lg bg-red-900/80 hover:bg-red-800 text-sm font-semibold text-red-100 transition-colors"
                >
                  Desistir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NpcPlayReveal cardName={npcPlayReveal?.cardName ?? null} />

      {/* Slash impact on the target card or hero */}
      <AttackImpact
        show={showAttackAnim}
        targetId={activeImpact?.targetId ?? null}
        targetHero={activeImpact?.targetHero ?? null}
      />

      {/* Hero power beam + holy impact (Purify etc.) */}
      {pendingHeroPower && (
        <HeroPowerBeam
          sourceHero={pendingHeroPower.isNpc ? 'opponent' : 'player'}
          targetId={pendingHeroPower.targetId}
          targetHero={pendingHeroPower.targetHero}
          pathway={pendingHeroPower.pathway}
          phase={pendingHeroPower.phase}
          powerName={pendingHeroPower.isNpc ? `Inimigo: ${pendingHeroPower.powerName}` : pendingHeroPower.powerName}
        />
      )}
      <HeroPowerImpact
        show={showHeroPowerAnim}
        targetId={activeHeroPowerImpact?.targetId ?? null}
        targetHero={activeHeroPowerImpact?.targetHero ?? null}
        pathway={pendingHeroPower?.pathway ?? opponent.pathway}
      />

      {(pendingRitual ?? playerRitual) && (
        <RitualEffect
          cardName={(pendingRitual ?? playerRitual)!.cardName}
          pathway={(pendingRitual ?? playerRitual)!.pathway}
          targetIds={(pendingRitual ?? playerRitual)!.targetIds}
          targetHero={(pendingRitual ?? playerRitual)!.targetHero}
          isAoE={(pendingRitual ?? playerRitual)!.isAoE}
          fullBoard={(pendingRitual ?? playerRitual)!.fullBoard}
          isNpc={(pendingRitual ?? playerRitual)!.isNpc}
          phase={(pendingRitual ?? playerRitual)!.phase}
          showImpact={showRitualAnim}
        />
      )}

      {/* Attack preview arrows — all valid targets when selecting (mobile-friendly) */}
      {selectedAttacker && attackTargets && (
        <AttackTargetArrows
          attackerId={selectedAttacker}
          targetMinionIds={attackTargets.validMinionIds}
          showHero={attackTargets.heroValid}
          targetHero="opponent"
          isPlayerAttacking
        />
      )}
      {weaponAttackMode && weaponTargets && (
        <AttackTargetArrows
          attackerHero="player"
          targetMinionIds={weaponTargets.validMinionIds}
          showHero={weaponTargets.heroValid}
          targetHero="opponent"
          isPlayerAttacking
        />
      )}

      {/* Active attack animation arrow (NPC or online opponent) */}
      {activeEnemyAttack && (
        <AttackArrow
          attackerId={activeEnemyAttack.attackerId}
          targetId={activeEnemyAttack.targetId}
          targetHero={activeEnemyAttack.targetHero}
          isPlayerAttacking={false}
          phase={activeEnemyAttack.phase}
        />
      )}

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
                  ? unlockedPathway
                    ? `Pathway ${PATHWAYS[unlockedPathway].name} desbloqueado!`
                    : rewardPack
                      ? 'Você ganhou um pacote de cartas!'
                      : 'Seu oponente foi derrotado!'
                  : gameState.winner === null
                  ? 'Ambos caíram ao mesmo tempo.'
                  : playerConceded
                    ? 'Você desistiu da partida.'
                    : 'Sua vida chegou a zero.'}
              </motion.p>
              {gameState.winner === playerId && unlockedPathway && (
                <motion.p
                  className="text-xs text-purple-300 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  🔓 {PATHWAYS[unlockedPathway].name} agora pode ser escolhido no menu.
                </motion.p>
              )}
              {gameState.winner === playerId && rewardPack && (
                <motion.p
                  className="text-xs text-gold-400 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65 }}
                >
                  Abra o pacote para desbloquear novas cartas na coleção.
                </motion.p>
              )}
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

      {rewardPack && (
        <PackOpening
          pack={rewardPack}
          onClose={() => setRewardPack(null)}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* ─── Opponent area ─────────────────────────────────────────────── */}
        <div className="flex-none p-2 pb-1">
          <div className="flex items-center gap-3">
            <div
              data-hero-enemy
              className={`relative ${
                attackTargets?.heroValid ||
                playTargets?.allowEnemyHero ||
                (weaponAttackMode && weaponTargets?.heroValid) ||
                (heroPowerMode && heroPowerAllowsEnemyHero(heroPowerMode, opponent))
                  ? 'cursor-crosshair'
                  : ''
              }`}
              onClick={() => handleHeroClick(true)}
              onMouseEnter={() => {
                if (selectedAttacker && attackTargets?.heroValid) setArrowTargetHero(true);
                if (weaponAttackMode && weaponTargets?.heroValid) setArrowTargetHero(true);
              }}
              onMouseLeave={() => setArrowTargetHero(false)}
              onPointerEnter={() => {
                if (selectedAttacker && attackTargets?.heroValid) setArrowTargetHero(true);
                if (weaponAttackMode && weaponTargets?.heroValid) setArrowTargetHero(true);
              }}
              onPointerLeave={() => setArrowTargetHero(false)}
            >
              {(selectedAttacker && attackTargets?.heroValid) ||
              playTargets?.allowEnemyHero ||
              (weaponAttackMode && weaponTargets?.heroValid) ||
              (heroPowerMode && heroPowerAllowsEnemyHero(heroPowerMode, opponent)) ? (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-400/70 shadow-red-500/40 shadow-lg z-10 pointer-events-none"
                  animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              ) : null}
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
                hasWeapon={!!opponent.weapon}
                weaponAttack={opponent.weapon?.currentAttack}
                isBeingAttacked={damagedHero === 'opponent'}
                isCastingPower={castingHero === 'opponent'}
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
          validTargetIds={opponentBoardTargets}
          attackingMinion={attackingMinion}
          damagedMinion={damagedMinion}
          ritualTargetIds={ritualTargetIds}
          damagedMinionIds={ritualDamagedIds}
          onMinionClick={handleMinionClick}
          onValidTargetHover={(id, hovering) => {
            if (hovering) setArrowTargetId(id);
            else setArrowTargetId(null);
          }}
        />

        {/* ─── Center divider + controls ─────────────────────────────────── */}
        <div className="flex-none flex items-center justify-center py-2 px-3">
          <div className="flex flex-col items-center gap-2 w-full max-w-sm">
            {targetingHeroPower && heroPowerMode && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-gold-200 text-center px-3 py-1.5 rounded-lg bg-gold-900/30 border border-gold-400/40"
              >
                {heroPowerMode === 'friendly-minion'
                  ? '⚡ Tempest — clique em um minion aliado no seu campo'
                  : `Escolha o alvo para ${pathwayInfo.powerName}`}
              </motion.p>
            )}
          <div className="flex items-center gap-3 w-full">
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
        </div>

        {/* ─── Player board ──────────────────────────────────────────────── */}
        <AnimatedBoard
          minions={player.board}
          isEnemy={false}
          selectedAttacker={selectedAttacker}
          validTargetIds={playerBoardTargets}
          attackingMinion={attackingMinion}
          damagedMinion={damagedMinion}
          ritualTargetIds={ritualTargetIds}
          damagedMinionIds={ritualDamagedIds}
          onMinionClick={handleMinionClick}
        />

        {/* ─── Player area ───────────────────────────────────────────────── */}
        <div className="flex-none p-2 pt-1">
          <div className="flex items-center gap-3">
            <div
              data-hero-player
              className={`relative ${damagedHero === 'player' ? 'z-20' : ''} ${
                playTargets?.allowFriendlyHero ||
                (heroPowerMode && heroPowerAllowsFriendlyHero(heroPowerMode)) ||
                (player.weapon && isMyTurn && !isGameOver && !targetingHeroPower)
                  ? 'cursor-crosshair'
                  : ''
              }`}
              onClick={() => handleHeroClick(false)}
            >
              {(playTargets?.allowFriendlyHero ||
                (heroPowerMode && heroPowerAllowsFriendlyHero(heroPowerMode)) ||
                weaponAttackMode) && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-green-400/70 shadow-green-500/40 shadow-lg z-10 pointer-events-none"
                  animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
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
                hasWeapon={!!player.weapon}
                weaponAttack={player.weapon?.currentAttack}
                isBeingAttacked={damagedHero === 'player'}
                isCastingPower={castingHero === 'player'}
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
            {player.weapon && isMyTurn && !isGameOver && (
              <motion.button
                type="button"
                onClick={() => {
                  if (weaponAttackMode) {
                    setWeaponAttackMode(false);
                    addLog('Ataque com arma cancelado', 'system');
                  } else {
                    startWeaponAttack();
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative px-2.5 py-2 rounded-xl text-[10px] font-medium border transition-all ${
                  weaponAttackMode
                    ? 'ring-2 ring-yellow-400/70 border-yellow-400/50 bg-yellow-900/30 text-yellow-100'
                    : 'border-yellow-600/50 bg-yellow-900/20 text-yellow-200 hover:bg-yellow-900/40'
                }`}
              >
                <div className="font-bold text-[11px]">⚔️ {player.weapon.currentAttack}</div>
                <div className="text-[8px] text-yellow-300/80">{player.weapon.durability} dur</div>
              </motion.button>
            )}
            <motion.button
              ref={heroPowerBtnRef}
              onClick={handleHeroPower}
              onMouseEnter={() => setHeroPowerHover(true)}
              onMouseLeave={() => setHeroPowerHover(false)}
              disabled={!isMyTurn || player.heroPowerUsed || player.spirituality < 2}
              whileHover={isMyTurn && !player.heroPowerUsed ? { scale: 1.05 } : undefined}
              whileTap={isMyTurn && !player.heroPowerUsed ? { scale: 0.95 } : undefined}
              className={`relative px-3 py-2 rounded-xl text-[10px] font-medium border transition-all ${
                targetingHeroPower
                  ? 'ring-2 ring-gold-400/70 border-gold-400/50 bg-gold-900/20 text-gold-100'
                  : isMyTurn && !player.heroPowerUsed && player.spirituality >= 2
                  ? 'border-purple-400/60 bg-purple-900/50 text-purple-200 hover:bg-purple-800/60'
                  : 'border-void-700 bg-void-900/50 text-void-500 cursor-not-allowed'
              }`}
            >
              <div className="font-bold text-[11px]">{pathwayInfo.powerName}</div>
              <div className="text-[8px] text-void-400">Custo: 2</div>
            </motion.button>
            <AnchorTooltip
              anchorEl={heroPowerBtnRef.current}
              show={heroPowerHover}
              placement="top"
            >
              <p className="text-[10px] font-semibold text-purple-200 mb-1">{pathwayInfo.powerName}</p>
              <p className="text-[10px] text-void-200 leading-relaxed">{pathwayInfo.powerDescription}</p>
            </AnchorTooltip>

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
        <div className="flex-none flex flex-col gap-4 pt-1 pb-1 min-w-0 w-full safe-bottom">
          <div className="min-h-[5.25rem] shrink-0 flex items-end justify-center px-3 relative z-50">
            {previewCard && (
              <div className="max-w-sm w-full px-3 py-2.5 rounded-xl bg-void-900/98 border border-gold-400/40 text-center shadow-xl">
                {targetingHandIndex !== null ? (
                  <p className="text-[10px] text-gold-200">
                    Escolha o alvo para <span className="font-semibold">{previewCard.name}</span>
                  </p>
                ) : hoveredKeyword ? (
                  <>
                    <p className="text-[11px] font-semibold text-purple-200">
                      {getKeywordInfo(hoveredKeyword).icon} {getKeywordInfo(hoveredKeyword).name}
                    </p>
                    <p className="text-[10px] text-void-200 mt-1 leading-snug">
                      {getKeywordInfo(hoveredKeyword).description}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-white">{previewCard.name}</p>
                    <p className="text-[10px] text-void-300 mt-0.5 leading-snug">
                      {previewCard.description ||
                        (previewCard.type === 'sealed-artifact'
                          ? 'Arma — equipe e clique no seu herói para atacar.'
                          : 'Sem efeito especial.')}
                    </p>
                    {previewCard.keywords && previewCard.keywords.length > 0 && (
                      <p className="text-[9px] text-purple-300 mt-1">
                        Passe o mouse na palavra-chave na carta para ver o significado
                      </p>
                    )}
                    {selectedHandIndex !== null && targetingHandIndex === null && (
                      <p className="text-[9px] text-gold-300 mt-1">Clique na carta de novo para jogar</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="hand-scroll h-[8.5rem] w-full min-w-0 relative z-20" aria-label="Mão de cartas">
            <div className="flex flex-nowrap items-end justify-center gap-1.5 w-max min-w-full px-3 pb-1 pt-2">
              <AnimatePresence mode="popLayout">
                {player.hand.map((card, index) => {
                  const isSelected = selectedHandIndex === index || targetingHandIndex === index;
                  const anotherSelected =
                    (selectedHandIndex !== null || targetingHandIndex !== null) && !isSelected;

                  return (
                    <motion.div
                      key={`${card.id}-${index}`}
                      layout
                      initial={{ scale: 0.5, y: 60, opacity: 0, rotate: -5 }}
                      animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, y: -60, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className={`relative flex-shrink-0 ${isSelected ? 'z-30' : anotherSelected ? 'z-10' : 'z-20'}`}
                    >
                      <CardComponent
                        card={card}
                        playable={isMyTurn && card.cost <= player.spirituality && !isGameOver}
                        selected={isSelected}
                        compactHand
                        suppressHoverLift={anotherSelected}
                        showHoverPreview={anotherSelected}
                        onKeywordHover={setHoveredKeyword}
                        onHoverChange={(hovering) => {
                          if (hovering && !isSelected) {
                            setHoveredHandIndex(index);
                          } else if (hoveredHandIndex === index) {
                            setHoveredHandIndex(null);
                          }
                          if (!hovering) setHoveredKeyword(null);
                        }}
                        onClick={() => handleHandCardClick(index)}
                      />
                    </motion.div>
                  );
                })}
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
