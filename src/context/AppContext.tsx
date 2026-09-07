import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AppContextType, BlockListStatus } from '@/types';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { canAccessVipFeatures, getTrialEligibility, type EntitlementStatus } from '@/utils/entitlement';

// ✅ 2. 建立 Context
export const AppContext = createContext<AppContextType | undefined>(undefined);

// 3. 建立 Provider 統一管理所有跨元件的狀態
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [stealthMode, setStealthMode] = useState(false);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [blockListStatus, setBlockListStatus] = useState<BlockListStatus>('loading');
  const [travelMode, setTravelMode] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVIP, setIsVIP] = useState(false);
  const [entitlementStatus, setEntitlementStatus] = useState<EntitlementStatus>('loading');
  const [entitlementError, setEntitlementError] = useState<string | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [simulateBlocked, setSimulateBlocked] = useState(false);
  const trialEligibility = getTrialEligibility();
  const hasVipAccess = canAccessVipFeatures(entitlementStatus, isVIP);

  useEffect(() => {
    let isMounted = true;

    const loadVipEntitlement = async () => {
      if (!user?.id) {
        if (isMounted) {
          setIsVIP(false);
          setEntitlementStatus('unauthenticated');
          setEntitlementError(null);
          setShowPaywall(false);
        }
        return;
      }

      if (isMounted) {
        setIsVIP(false);
        setEntitlementStatus('loading');
        setEntitlementError(null);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_vip')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error('🔴 載入 VIP 資格失敗:', error);
        setIsVIP(false);
        setEntitlementStatus('error');
        setEntitlementError('無法確認 VIP 資格，請稍後再試。');
        setShowPaywall(false);
        return;
      }

      if (!data) {
        console.error('🔴 找不到目前使用者的 VIP 資格資料。');
        setIsVIP(false);
        setEntitlementStatus('error');
        setEntitlementError('找不到個人檔案，無法確認 VIP 資格。');
        setShowPaywall(false);
        return;
      }

      setIsVIP(data.is_vip === true);
      setEntitlementStatus('ready');
      setEntitlementError(null);
    };

    void loadVipEntitlement();
    return () => { isMounted = false; };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadBlockedUsers = async () => {
      if (!user?.id) {
        if (isMounted) {
          setBlockedUsers(new Set());
          setBlockListStatus('unauthenticated');
        }
        return;
      }

      if (isMounted) {
        setBlockedUsers(new Set());
        setBlockListStatus('loading');
      }

      const { data, error } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) {
        console.error('🔴 載入封鎖名單失敗:', error);
        if (isMounted) setBlockListStatus('error');
        return;
      }

      if (isMounted) {
        setBlockedUsers(new Set((data ?? []).map((row) => row.blocked_id)));
        setBlockListStatus('ready');
      }
    };

    void loadBlockedUsers();
    return () => { isMounted = false; };
  }, [user?.id]);

  const blockUser = async (id: string) => {
    if (!user?.id) throw new Error('請先登入後再封鎖使用者。');
    if (user.id === id) throw new Error('無法封鎖自己。');

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('🔴 查詢封鎖紀錄失敗:', fetchError);
        throw fetchError;
      }

      if (existing) {
        setBlockedUsers(prev => new Set(prev).add(id));
        return;
      }

      setBlockedUsers(prev => new Set(prev).add(id));

      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: user.id, blocked_id: id });

      if (error) {
        console.error('🔴 封鎖 insert 失敗:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }
    } catch (error) {
      console.error('🔴 封鎖寫入失敗:', error);
      setBlockedUsers(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw error;
    }
  };

  const unblockUser = async (id: string) => {
    if (!user?.id) throw new Error('請先登入後再解除封鎖。');

    setBlockedUsers(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', id);
      if (error) throw error;
    } catch (error) {
      console.error('🔴 解除封鎖失敗:', error);
      setBlockedUsers(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      throw error;
    }
  };

  const requestVipUpgrade = () => {
    if (entitlementStatus === 'ready' && !hasVipAccess) {
      setShowPaywall(true);
    }
  };

  const dismissPaywall = () => setShowPaywall(false);

  return (
    <AppContext.Provider
      value={{
        stealthMode, setStealthMode,
        unreadInbox, setUnreadInbox,
        unreadChat, setUnreadChat,
        showPaywall, requestVipUpgrade, dismissPaywall,
        blockedUsers, blockListStatus, blockUser, unblockUser,
        isVerified, setIsVerified,
        isVIP, hasVipAccess, entitlementStatus, entitlementError, trialEligibility,
        myAvatar, setMyAvatar,
        travelMode, setTravelMode,
        simulateBlocked,
        setSimulateBlocked,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// 4. 關鍵匯出：靈魂 Hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp 必須在 AppProvider 內部使用');
  }
  return context;
};
