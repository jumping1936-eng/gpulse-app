-- 1. 確保名片表有開啟安全防護機制
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. 清除可能衝突的舊規則
DROP POLICY IF EXISTS "允許所有人讀取Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3. 建立全局讀取規則：允許所有「已登入 (authenticated)」的使用者，讀取所有人的名片
CREATE POLICY "允許所有登入者讀取名片"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
