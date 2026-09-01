import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { AppState } from '@/types';
import SafetyGuard from '@/components/SafetyGuard';
import LoginScreen from '@/components/LoginScreen';
import LegalTerms from '@/components/LegalTerms';
import MainApp from '@/components/MainApp';
import { Loader2, Activity } from 'lucide-react';
import { supabase } from './supabaseClient';

import { AuthProvider, useAuth } from '@/context/AuthContext';

// ==========================================
// 核心業務邏輯元件 (確保被 AuthProvider 包覆)
// ==========================================
function AppContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { simulateBlocked, setSimulateBlocked } = useApp();

  const [appState, setAppState] = useState<AppState>('safety-check');
  const [isChecking, setIsChecking] = useState(true);

  // 資料庫連線測試
  useEffect(() => {
    const testConnection = async () => {
      const { error } = await supabase.from('profiles').select('*').limit(1);
      if (error) {
        console.error("❌ 連線失敗，請檢查金鑰或網路：", error.message);
      } else {
        console.log("✅ 資料庫連線成功！");
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
    } else if (user) {
      // 🌟 神奇魔法：如果偵測到使用者已登入，直接跳轉到 MainApp，略過 Login 與 Legal
      setAppState('app'); 
    } else {
      // 訪客或未登入，乖乖去登入畫面
      setAppState('login');
    }
  }, [isChecking, isAuthLoading, user, simulateBlocked]);

  // 畫面 1：雙重 Loading 狀態 (地理檢查 or 驗證身份解析中)
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
    <>
      {appState === 'blocked' && (
        <SafetyGuard onSimulateReal={() => { setSimulateBlocked(false); }} />
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
    </>
  );
}

// ==========================================
// 系統最外層入口 (裝載 Auth 大腦)
// ==========================================
export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}