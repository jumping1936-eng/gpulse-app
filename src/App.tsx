import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { AppState } from '@/types';
import SafetyGuard from '@/components/SafetyGuard';
import LoginScreen from '@/components/LoginScreen';
import LegalTerms from '@/components/LegalTerms';
import MainApp from '@/components/MainApp';
import ProfileView from '@/components/profile/ProfileView';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import GPulseLogo from '@/components/brand/GPulseLogo';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { useLanguage } from '@/context/LanguageContext';
import type { LegalDocumentId } from '@/legal/legalDocuments';

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
  const [legalDocument, setLegalDocument] = useState<LegalDocumentId>('terms');
  const [legalReturnState, setLegalReturnState] = useState<'login' | 'app'>('login');
  const [consentKey, setConsentKey] = useState(0);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  const openLegal = async (document: LegalDocumentId, returnState: 'login' | 'app') => {
    setLegalDocument(document);
    setLegalReturnState(returnState);
    setAppState('legal');
  };

  const acceptConsent = async () => {
    const { error } = await supabase.auth.updateUser({ data: { legal_consent: true } });
    if (error) {
      console.error('Failed to record legal consent:', error);
      return;
    }
    setConsentKey(k => k + 1);
  };

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

  // ✅ 3. 狀態機引擎：嚴格判斷「地理檢查」「Auth」「個人檔案」「法律同意」
  const [authReady, setAuthReady] = useState(false);
  const [userNeedsConsent, setUserNeedsConsent] = useState(false);
  const [userNeedsProfile, setUserNeedsProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkProfileAndConsent = async () => {
      if (!user) { setAuthReady(true); setCheckedUserId(null); return; }
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!isMounted || !authUser) {
          if (isMounted) { setAuthReady(true); setCheckedUserId(null); }
          return;
        }
        if (isMounted) setCheckedUserId(authUser.id);
        const consentGiven = authUser.user_metadata?.legal_consent === true;
        if (isMounted) setUserNeedsConsent(!consentGiven);
        const { data: profile, error: profileError } = await supabase
          .from('profiles').select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (!isMounted) return;
        const incomplete = profileError || !profile || !profile.full_name || profile.full_name.trim() === '';
        if (isMounted) setUserNeedsProfile(incomplete);
      } catch {
        if (isMounted) { setUserNeedsProfile(true); setCheckedUserId(null); }
      }
      if (isMounted) setAuthReady(true);
    };
    checkProfileAndConsent();
    return () => { isMounted = false; };
  }, [user, consentKey]);

  useEffect(() => {
    if (isChecking || isAuthLoading || !authReady) return;
    if (simulateBlocked) {
      setAppState('blocked');
    } else if (isPasswordRecovery) {
      setAppState('login');
    } else if (user) {
      if (checkedUserId !== user.id) {
        setAppState('login');
        return;
      }
      if (userNeedsConsent) {
        setAppState('legal');
        setLegalDocument('terms');
        setLegalReturnState('app');
      } else if (userNeedsProfile) {
        setAppState('profile-setup');
      } else {
        setAppState('app');
      }
    } else {
      setAppState('login');
    }
  }, [isChecking, isAuthLoading, authReady, user, simulateBlocked, isPasswordRecovery, userNeedsConsent, userNeedsProfile, checkedUserId]);

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
          onLogin={() => openLegal('terms', 'app')}
          onOpenLegalDocument={(document) => openLegal(document, 'login')}
          isPasswordRecovery={isPasswordRecovery}
          onPasswordRecoveryComplete={() => {
            completePasswordRecovery();
            setAppState(user ? 'app' : 'login');
          }}
        />
      )}
      {appState === 'legal' && (
        <LegalTerms
          initialDocument={legalDocument}
          onAccept={user && userNeedsConsent ? acceptConsent : undefined}
          onClose={() => {
            if (userNeedsConsent) return;
            setAppState(legalReturnState);
          }}
        />
      )}
      {appState === 'profile-setup' && (
        <ProfileView onComplete={() => setAppState('app')} />
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
