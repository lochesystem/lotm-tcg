-- Ranked PvP stats and leaderboard support

ALTER TABLE public.player_progress
  ADD COLUMN IF NOT EXISTS ranked_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ranked_losses INTEGER NOT NULL DEFAULT 0;

-- Allow ranked match mode in history
ALTER TABLE public.match_history
  DROP CONSTRAINT IF EXISTS match_history_match_mode_check;

ALTER TABLE public.match_history
  ADD CONSTRAINT match_history_match_mode_check
  CHECK (match_mode IS NULL OR match_mode IN ('story', 'npc', 'pvp', 'ranked'));

CREATE INDEX IF NOT EXISTS idx_player_progress_ranked_wins
  ON public.player_progress (ranked_wins DESC);

-- Public leaderboard (only exposes safe columns)
CREATE OR REPLACE FUNCTION public.get_ranked_leaderboard(result_limit int DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  ranked_wins int,
  ranked_losses int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pr.id AS user_id,
    pr.username,
    pr.display_name,
    pp.ranked_wins,
    pp.ranked_losses
  FROM public.player_progress pp
  INNER JOIN public.profiles pr ON pr.id = pp.owner_id
  WHERE pp.ranked_wins > 0
  ORDER BY pp.ranked_wins DESC, pp.ranked_losses ASC, pr.username ASC
  LIMIT GREATEST(1, LEAST(result_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_ranked_leaderboard(int) TO anon, authenticated;
