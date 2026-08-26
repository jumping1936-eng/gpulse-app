// src/App.tsx
import React, { useState, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { AppState } from '@/types';
import SafetyGuard from '@/components/SafetyGuard';
import LoginScreen from '@/components/LoginScreen';
import LegalTerms from '@/components/LegalTerms';
import MainApp from '@/components/MainApp';
import { Loader2, Activity } from 'lucide-react';
import { supabase } from './supabaseClient';

// ✅ 1. 引入剛剛建立的 AuthContext 大腦
import { AuthProvider, useAuth } from '@/context/AuthContext'; 

// ==========================================
// 核心業務邏輯元件 (原本的 App 降級移至此處)
// ==========================================
function AppContent() {
  // 取得 Supabase 驗證狀態
  const { user, isLoading: isAuthLoading } = useAuth(); 

  const [appState, setAppState] = useState<AppState>('safety-check');
  const [isChecking, setIsChecking] = useState(true);

  // Global state (保留您原本的所有設定)
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

  // 資料庫連線測試 (保留您的設計)
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

  // ✅ 2. 地理位置檢查模擬 (只控制 isChecking)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  // ✅ 3. 狀態機引擎：綜合判斷「地理檢查」與「登入狀態」
  useEffect(() => {
    // 如果地理檢查還沒跑完，或是 AuthContext 還在跟伺服器連線，就繼續等
    if (isChecking || isAuthLoading) return;

    if (simulateBlocked) {
      setAppState('blocked');
    } else if (user) {
      // 🌟 神奇魔法：如果偵測到使用者已登入，直接跳轉到 MainApp，略過 Login 與 Legal
      setAppState('app'); 
    } else {
      // 訪客或未登入，乖乖去登入畫面
      setAppState('login');
    }
  }, [isChecking, isAuthLoading, user, simulateBlocked]);

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

  // 畫面 1：雙重 Loading 狀態 (地理檢查 or 驗證身份中)
  if (isChecking || isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-violet-500/30">
          <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <Loader2 className="w-6 h-6 text-violet-400/60 animate-spin" />
        <p className="text-white/20 text-xs tracking-widest uppercase">
          {isAuthLoading ? "正在驗證身份狀態..." : "正在檢查您的所在地區..."}
        </p>
      </div>
    );
  }

  // 畫面 2：主應用程式路由
  return (
    <AppContext.Provider value={ctx}>
      {appState === 'blocked' && (
        <SafetyGuard onSimulateReal={() => { setSimulateBlocked(false); }} />
      )}
      {/* 若是新登入，走原本的 Legal 流程；若是已登入，上面的 useEffect 會直接切換到 'app' */}
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

// ==========================================
// 系統最外層入口 (裝載 Auth 大腦)
// ==========================================
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}