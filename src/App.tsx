import React, { useState, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { AppState } from '@/types';
import SafetyGuard from '@/components/SafetyGuard';
import LoginScreen from '@/components/LoginScreen';
import LegalTerms from '@/components/LegalTerms';
import MainApp from '@/components/MainApp';
import { Loader2, Activity } from 'lucide-react';
// ✅ 新增這行：匯入 Supabase 連線實體
import { supabase } from './supabaseClient';

export default function App() {
  const [appState, setAppState] = useState<AppState>('safety-check');
  const [isChecking, setIsChecking] = useState(true);

  // Global state
  const [isVIP, setIsVIP] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [stealthMode, setStealthMode] = useState(false);
  const [travelMode, setTravelMode] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [unreadInbox] = useState(3);
  const [unreadChat, setUnreadChat] = useState(3);
  const [showPaywall, setShowPaywall] = useState(false);
  const [simulateBlocked, setSimulateBlocked] = useState(false);

  // ✅ 新增這段：Supabase 連線心跳測試 (Health Check)
  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error("❌ 連線失敗，請檢查金鑰或網路：", error.message);
      } else {
        console.log("✅ 資料庫連線成功！目前 Profiles 資料：", data);
      }
    };
    testConnection();
  }, []);

  // Simulate geo-check on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
      if (simulateBlocked) {
        setAppState('blocked');
      } else {
        setAppState('login');
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  // React to simulateBlocked flag changes after initial load
  useEffect(() => {
    if (!isChecking) {
      if (simulateBlocked) {
        setAppState('blocked');
      } else if (appState === 'blocked') {
        setAppState('login');
      }
    }
  }, [simulateBlocked]);

  function blockUser(id: string) {
    setBlockedUsers(prev => new Set([...prev, id]));
  }

  const ctx = {
    isVIP, setIsVIP,
    isVerified, setIsVerified,
    myAvatar, setMyAvatar,
    stealthMode, setStealthMode,
    travelMode, setTravelMode,
    blockedUsers, blockUser,
    unreadInbox, unreadChat, setUnreadChat,
    showPaywall, setShowPaywall,
    simulateBlocked, setSimulateBlocked,
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-violet-500/30">
          <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <Loader2 className="w-6 h-6 text-violet-400/60 animate-spin" />
        <p className="text-white/20 text-xs tracking-widest uppercase">正在檢查您的所在地區...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      {appState === 'blocked' && (
        <SafetyGuard onSimulateReal={() => { setSimulateBlocked(false); setAppState('login'); }} />
      )}
      {appState === 'login' && (
        <LoginScreen onLogin={() => setAppState('legal')} />
      )}
      {appState === 'legal' && (
        <LegalTerms onAccept={() => setAppState('app')} />
      )}
      {appState === 'app' && (
        <MainApp />
      )}
    </AppContext.Provider>
  );
}