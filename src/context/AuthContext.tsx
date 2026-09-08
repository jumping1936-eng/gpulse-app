import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  completePasswordRecovery: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  
  // ✅ 總監特調 PKCE 攔截器：同時監聽 search (?code=) 與 hash (#access_token=)
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasCode = window.location.search.includes('code=');
      const hasToken = window.location.hash.includes('access_token');
      const hasError = window.location.search.includes('error=') || window.location.hash.includes('error');
      
      return hasCode || hasToken || hasError;
    }
    return true;
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("🔴 [Auth] 獲取 Session 失敗:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        window.history.replaceState(null, '', window.location.pathname);
      }

      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      // ✅ 解析成功後，將網址列的 ?code= 或 #access_token= 抹除
      if (event === 'SIGNED_IN') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      user,
      isLoading,
      isPasswordRecovery,
      completePasswordRecovery: () => setIsPasswordRecovery(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
};
