import React, { createContext, useContext, useState, ReactNode } from 'react';

// 1. 定義全域狀態的 TypeScript 型別
export interface AppContextType {
  stealthMode: boolean;
  setStealthMode: (val: boolean) => void;
  unreadInbox: number;
  setUnreadInbox: (val: number) => void;
  unreadChat: number;
  setUnreadChat: (val: number) => void;
  showPaywall: boolean;
  setShowPaywall: (val: boolean) => void;
  blockedUsers: Set<string>;
  blockUser: (id: string) => void;
  isVerified: boolean;
  isVIP: boolean;
  myAvatar: string;
}

// ✅ 2. 建立 Context (加上 export，完美解決 App.tsx 報錯)
export const AppContext = createContext<AppContextType | undefined>(undefined);

// 3. 建立 Provider 統一管理所有跨元件的狀態
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [stealthMode, setStealthMode] = useState(false);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  
  // 靜態資料（可依據您未來的需求，改由 Supabase 讀取真實資料）
  const [isVerified] = useState(false); 
  const [isVIP] = useState(false);      
  const [myAvatar] = useState('');      

  // 封鎖用戶邏輯：將 ID 加入 Set 中
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
        isVerified, isVIP, myAvatar
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