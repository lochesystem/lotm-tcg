import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  SHOP_PACKS,
  getUnlockedShopPacks,
  openPack,
  openPathwayPack,
  type ShopPackId,
  type PackResult,
} from 'game-engine';
import { Screen } from '../App';
import { useCollectionStore } from '../stores/collectionStore';
import { PackOpening } from '../components/PackOpening';
import { useTranslation } from '../i18n';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function ShopScreen({ onNavigate }: Props) {
  const { t } = useTranslation();
  const essenceBalance = useCollectionStore((s) => s.essenceBalance);
  const storyProgress = useCollectionStore((s) => s.storyProgress);
  const spendEssence = useCollectionStore((s) => s.spendEssence);

  const [packResult, setPackResult] = useState<PackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlockedPacks = getUnlockedShopPacks(storyProgress);
  const lockedPacks = SHOP_PACKS.filter((p) => !unlockedPacks.some((u) => u.id === p.id));

  const handleBuy = async (packId: ShopPackId) => {
    const def = SHOP_PACKS.find((p) => p.id === packId);
    if (!def) return;

    setError(null);
    const ok = await spendEssence(def.cost);
    if (!ok) {
      setError(t('shop.notEnoughEssence'));
      return;
    }

    const result = def.pathway
      ? openPathwayPack(def.pathway, def.packType, Date.now())
      : openPack(def.packType, Date.now());

    setPackResult(result);
  };

  return (
    <div className="flex-1 min-h-0 screen-scroll safe-bottom bg-void-950">
      <div className="p-4 max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-sm text-void-400 hover:text-void-200 mb-4"
        >
          ← {t('common.back')}
        </button>

        <h1 className="text-2xl font-bold text-void-100 mb-1">{t('shop.title')}</h1>
        <p className="text-sm text-void-400 mb-6">
          {t('shop.balance', { amount: essenceBalance })}
        </p>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <h2 className="text-sm font-semibold text-void-300 uppercase tracking-wider mb-3">
          {t('shop.available')}
        </h2>
        <div className="flex flex-col gap-2 mb-8">
          {unlockedPacks.map((pack) => (
            <motion.button
              key={pack.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleBuy(pack.id)}
              disabled={essenceBalance < pack.cost}
              className="flex items-center justify-between p-4 rounded-xl border border-void-600 bg-void-900/60 hover:bg-void-800/60 disabled:opacity-40"
            >
              <div className="text-left">
                <p className="font-semibold text-void-100">{pack.name}</p>
                <p className="text-xs text-void-500">{t(`pack.${pack.packType}.name`)}</p>
              </div>
              <span className="text-amber-400 font-bold">{pack.cost} ✦</span>
            </motion.button>
          ))}
        </div>

        {lockedPacks.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-void-500 uppercase tracking-wider mb-3">
              {t('shop.locked')}
            </h2>
            <div className="flex flex-col gap-2">
              {lockedPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-void-800 bg-void-950/60 opacity-50"
                >
                  <div className="text-left">
                    <p className="font-semibold text-void-400">{pack.name}</p>
                    <p className="text-xs text-void-600">
                      {t('shop.unlockAtChapter', { chapter: pack.storyRequired })}
                    </p>
                  </div>
                  <span className="text-void-600">🔒</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {packResult && (
        <PackOpening
          pack={packResult}
          onClose={() => setPackResult(null)}
        />
      )}
    </div>
  );
}
