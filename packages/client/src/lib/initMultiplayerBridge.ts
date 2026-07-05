import {
  connectMultiplayer,
  getOnlineRoomCode,
  sendMultiplayerAction,
  subscribeGameStart,
  subscribeGameState,
  type OnlineRole,
} from './multiplayerSocket';
import { useGameStore } from '../stores/gameStore';

export function initMultiplayerBridge(onEnterBattle: () => void): () => void {
  connectMultiplayer();

  useGameStore.getState().setOnlineSendAction(sendMultiplayerAction);

  const offStart = subscribeGameStart((state, role: OnlineRole) => {
    useGameStore.getState().enterOnlineBattle(state, role, getOnlineRoomCode());
    onEnterBattle();
  });

  const offState = subscribeGameState((state) => {
    if (useGameStore.getState().isOnline) {
      useGameStore.getState().syncOnlineState(state);
    }
  });

  return () => {
    offStart();
    offState();
  };
}
