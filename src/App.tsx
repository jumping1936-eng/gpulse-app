import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { AppState } from '@/types';
import SafetyGuard from '@/components/SafetyGuard';
import LoginScreen from '@/components/LoginScreen';
import LegalTerms from '@/components/LegalTerms';
import MainApp from '@/components/MainApp';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import GPulseLogo from '@/components/brand/GPulseLogo';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { useLanguage } from '@/context/LanguageContext';

// ==========================================
// 核心業務邏輯元件 (確保被 AuthProvider 包覆)
// ==========================================
function AppContent() {
  const {
    user,
    isLoading: isAuthLoading,
    isPasswordRecovery,
    completePasswordRecovery,
  } = useAuth();
  const { simulateBlocked, setSimulateBlocked } = useApp();
  const { t } = useLanguage();

  const [appState, setAppState] = useState<AppState>('safety-check');
  const [isChecking, setIsChecking] = useState(true);

  // 資料庫連線測試
  useEffect(() => {
    const testConnection = async () => {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        console.error("❌ 連線失敗，請檢查金鑰或網路：", error.message);
      }
    };
    testConnection();
  }, []);

  // 2. 地理位置檢查模擬 (只控制 isChecking)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  // ✅ 3. 狀態機引擎：嚴格判斷「地理檢查」與「登入狀態」
  useEffect(() => {
    // 嚴格阻擋：如果正在檢查地理位置，或是 AuthContext 正在解析 Google Token，強制等待
    if (isChecking || isAuthLoading) return;

    if (simulateBlocked) {
      setAppState('blocked');
    } else if (isPasswordRecovery) {
      setAppState('login');
    } else if (user) {
      // 🌟 神奇魔法：如果偵測到使用者已登入，直接跳轉到 MainApp，略過 Login 與 Legal
      setAppState('app'); 
    } else {
      // 訪客或未登入，乖乖去登入畫面
      setAppState('login');
    }
  }, [isChecking, isAuthLoading, user, simulateBlocked, isPasswordRecovery]);

  // 畫面 1：雙重 Loading 狀態 (地理檢查 or 驗證身份解析中)
  if (isChecking || isAuthLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#030617] flex flex-col items-center justify-center gap-4">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[58rem] -translate-x-1/2 -translate-y-[47%] rounded-[50%] border border-indigo-500/15 shadow-[0_0_65px_rgba(79,70,229,0.16)]" />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[25rem] w-[47rem] -translate-x-1/2 -translate-y-[45%] rounded-[50%] border border-violet-400/20 shadow-[0_0_45px_rgba(139,92,246,0.16)]" />
        <div className="relative flex flex-col items-center gap-4">
          <GPulseLogo size="lg" variant="full" glow="strong" />
        <Loader2 className="w-6 h-6 text-violet-400/60 animate-spin" />
        <p className="text-white/35 text-xs tracking-[0.18em] uppercase">
          {isAuthLoading ? t('splash.authLoading', '正在驗證身份狀態…') : t('splash.locationLoading', '正在檢查您的所在地區…')}
        </p>
        </div>
      </div>
    );
  }

  // 畫面 2：主應用程式路由
  return (
    <>
      {appState === 'blocked' && (
        <SafetyGuard onSimulateReal={() => { setSimulateBlocked(false); }} />
      )}
      {(appState === 'login' || isPasswordRecovery) && (
        <LoginScreen
          onLogin={() => setAppState('legal')}
          isPasswordRecovery={isPasswordRecovery}
          onPasswordRecoveryComplete={() => {
            completePasswordRecovery();
            setAppState(user ? 'app' : 'login');
          }}
        />
      )}
      {appState === 'legal' && (
        <LegalTerms onAccept={() => setAppState('app')} />
      )}
      {appState === 'app' && !isPasswordRecovery && (
        <MainApp />
      )}
    </>
  );
}

// ==========================================
// 系統最外層入口 (裝載 Auth 大腦)
// ==========================================
export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
