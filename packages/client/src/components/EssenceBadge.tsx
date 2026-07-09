import { EssenceIcon } from './EssenceIcon';
import { useTranslation } from '../i18n';

interface Props {
  amount: number;
}

export function EssenceBadge({ amount }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-cyan-700/25 bg-gradient-to-r from-cyan-950/50 via-void-950/80 to-purple-950/40 shadow-inner shadow-cyan-950/20"
      title={t('home.essenceBalance', { amount })}
    >
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-900/30 border border-cyan-600/20">
        <EssenceIcon className="w-3 h-3 text-cyan-400/90" />
      </span>
      <span className="text-sm font-bold tabular-nums leading-none text-cyan-100">{amount}</span>
    </div>
  );
}
