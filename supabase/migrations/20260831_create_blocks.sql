-- 1. 建立 blocks 資料表
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. 防止同一使用者重複封鎖同一對象
CREATE UNIQUE INDEX IF NOT EXISTS blocks_blocker_blocked_unique
  ON public.blocks (blocker_id, blocked_id);

-- 3. 禁止自我封鎖
ALTER TABLE public.blocks
  DROP CONSTRAINT IF EXISTS blocks_no_self_block;

ALTER TABLE public.blocks
  ADD CONSTRAINT blocks_no_self_block
  CHECK (blocker_id <> blocked_id);

-- 4. 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS blocks_blocker_id_idx ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_id_idx ON public.blocks (blocked_id);

-- 5. 啟用 RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- 6. 清除可能衝突的舊規則
DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can insert own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON public.blocks;

-- 7. 建立 RLS policies
-- 使用者只能讀取自己為 blocker_id 的封鎖紀錄
CREATE POLICY "Users can view own blocks"
  ON public.blocks
  FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- 使用者只能插入自己為 blocker_id 的封鎖紀錄
CREATE POLICY "Users can insert own blocks"
  ON public.blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- 使用者只能刪除自己為 blocker_id 的封鎖紀錄
CREATE POLICY "Users can delete own blocks"
  ON public.blocks
  FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());
