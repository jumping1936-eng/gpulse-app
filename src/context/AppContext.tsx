import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { AppContextType } from '@/types';
import { supabase } from '@/supabaseClient';

// ✅ 2. 建立 Context
export const AppContext = createContext<AppContextType | undefined>(undefined);

// 3. 建立 Provider 統一管理所有跨元件的狀態
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [stealthMode, setStealthMode] = useState(false);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [travelMode, setTravelMode] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVIP, setIsVIP] = useState(false);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [simulateBlocked, setSimulateBlocked] = useState(false);

  const blockUser = async (id: string) => {
    setBlockedUsers(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setBlockedUsers(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      console.log('[Block] request', {
        blockerId: user.id,
        blockedId: id,
        sameId: user.id === id,
        source: 'AppContext.blockUser',
      });

      if (user.id === id) {
        console.warn('[Block] 阻止自我封鎖', { blockerId: user.id, blockedId: id });
        setBlockedUsers(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

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
        return;
      }

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
    setBlockedUsers(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
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

  return (
    <AppContext.Provider
      value={{
        stealthMode, setStealthMode,
        unreadInbox, setUnreadInbox,
        unreadChat, setUnreadChat,
        showPaywall, setShowPaywall,
        blockedUsers, blockUser, unblockUser,
        isVerified, setIsVerified,
        isVIP, setIsVIP,
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