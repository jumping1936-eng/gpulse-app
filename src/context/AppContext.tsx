import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { AppContextType } from '@/types';

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

  const blockUser = (id: string) => {
    setBlockedUsers(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    console.log(`🛡️ [AppProvider] 已將用戶 ${id} 加入封鎖名單`);
  };

  return (
    <AppContext.Provider
      value={{
        stealthMode, setStealthMode,
        unreadInbox, setUnreadInbox,
        unreadChat, setUnreadChat,
        showPaywall, setShowPaywall,
        blockedUsers, blockUser,
        isVerified, setIsVerified,
        isVIP, setIsVIP,
        myAvatar, setMyAvatar,
        travelMode, setTravelMode,
        simulateBlocked: false,
        setSimulateBlocked: () => undefined,
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