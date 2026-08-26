import React, { useState, useEffect } from 'react';
import { Compass, MessageCircle, Bell, User, Ghost, Lock, KeyRound, Loader2 } from 'lucide-react';
import { Tab, Conversation } from '@/types';
import { useApp } from '@/context/AppContext';

// 組件引入 (保留您原有的所有架構)
import ExploreTab from '@/components/explore/ExploreTab';
import ChatList from '@/components/chat/ChatList';
import ChatRoom from '@/components/chat/ChatRoom';
import NotificationsTab from '@/components/notifications/NotificationsTab'; 
import ProfileView from '@/components/profile/ProfileView';
import PaywallModal from '@/components/PaywallModal';
import BlockedUsersList from '@/components/profile/BlockedUsersList';

// ✅ 總監匯入 Supabase，確保底層 API 連線正確
import { supabase } from '@/supabaseClient'; 

export default function MainApp() {
  const { stealthMode, unreadInbox, unreadChat, showPaywall, setShowPaywall } = useApp();
  
  // =====================================
  // 1. 核心路由與狀態管理 (Core State)
  // =====================================
  const [activeTab, setActiveTab] = useState<Tab>('explore');
  const [activeChatConvo, setActiveChatConvo] = useState<Conversation | null>(null);
  const [visualInboxCount, setVisualInboxCount] = useState(unreadInbox);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

  // =====================================
  // 2. 🎯 總監專屬：攔截強制重設密碼邏輯 (Security Boundary)
  // =====================================
  const [showForceReset, setShowForceReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // 【防呆優化】：不僅檢查 localStorage，同時確認使用者是否真的帶有合法的 Session
  useEffect(() => {
    const checkRecoveryStatus = async () => {
      const isRecoveryMode = localStorage.getItem('gpulse_recovery_mode') === 'true';
      if (isRecoveryMode) {
        // 確保 OTP 驗證後，Supabase 確實核發了暫時性的 Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setShowForceReset(true);
        } else {
          // 如果沒有 Session 卻有 Flag，代表是異常狀態 (可能過期)，自動清除並放行或要求重新登入
          localStorage.removeItem('gpulse_recovery_mode');
        }
      }
    };
    checkRecoveryStatus();
  }, []);

  async function handleForceReset() {
    if (newPassword.length < 6) {
      setResetError('密碼長度必須至少 6 個字元');
      return;
    }
    setResetLoading(true);
    setResetError('');
    
    try {
      // 呼叫 Supabase 更新這把鑰匙對應的密碼
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      // 成功後，清除暗號，解鎖畫面
      localStorage.removeItem('gpulse_recovery_mode');
      setShowForceReset(false);
      alert('✅ 密碼重設成功！歡迎回來。');
    } catch (err: any) {
      console.error('🔴 密碼重設失敗:', err);
      setResetError('更新失敗：' + (err.message || '請稍後再試'));
    } finally {
      setResetLoading(false);
    }
  }

  // =====================================
  // 3. UI 連動特效
  // =====================================
  useEffect(() => {
    setVisualInboxCount(unreadInbox);
  }, [unreadInbox]);

  const tabs = [
    { id: 'explore' as Tab, icon: Compass, label: '探索' },
    { id: 'chat' as Tab, icon: MessageCircle, label: '聊天', badge: unreadChat },
    { id: 'inbox' as Tab, icon: Bell, label: '通知', badge: visualInboxCount },
    { id: 'profile' as Tab, icon: User, label: '個人' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto relative">
      
      {/* 隱身模式提示條 */}
      {stealthMode && (
        <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-4 py-1.5 flex items-center gap-2 z-10">
          <Ghost className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-violet-400/80 text-xs font-medium">隱身模式 —只有你按讚的人能看見你</span>
        </div>
      )}

      {/* ===================================== */}
      {/* 主要內容渲染區 (Main Content Routing) */}
      {/* ===================================== */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'explore' && <ExploreTab />}
        
        {activeTab === 'chat' && !activeChatConvo && (
          <ChatList onOpenConvo={setActiveChatConvo} />
        )}
        
        {activeTab === 'chat' && activeChatConvo && (
          <ChatRoom convo={activeChatConvo} onBack={() => setActiveChatConvo(null)} />
        )}
        
        {activeTab === 'inbox' && <NotificationsTab />}
        
        {activeTab === 'profile' && (
          <ProfileView onOpenBlockedUsers={() => setShowBlockedUsers(true)} />
        )}
      </div>

      {/* ===================================== */}
      {/* 底部導航列 (Bottom Navigation) */}
      {/* ===================================== */}
      <nav className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/8 safe-area-bottom z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { 
                  setActiveTab(tab.id); 
                  setActiveChatConvo(null); 
                  if (tab.id === 'inbox') setVisualInboxCount(0);
                }}
                className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all group"
              >
                <div className={`relative transition-all duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
                  <Icon
                    className={`w-6 h-6 transition-all duration-200 ${
                      active
                        ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]'
                        : 'text-white/35 group-hover:text-white/60'
                    }`}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {/* 【總監優化】: 若有 Badge，則顯示未讀紅點/數字 */}
                  {tab.badge !== undefined && tab.badge > 0 && (
                     <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-slate-950 animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-all duration-200 ${active ? 'text-violet-400' : 'text-white/25'}`}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ===================================== */}
      {/* 系統級彈窗 (Modals) */}
      {/* ===================================== */}
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      
      {showBlockedUsers && (
        <BlockedUsersList onBack={() => setShowBlockedUsers(false)} />
      )}

      {/* ===================================== */}
      {/* 🚨 強制重設密碼鎖定畫面 (最高層級 z-[9999]，不准關閉) */}
      {/* ===================================== */}
      {showForceReset && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-300 flex flex-col items-center">
            
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
              <Lock className="w-10 h-10 text-emerald-400" />
            </div>
            
            <h2 className="text-white font-bold text-xl mb-2 tracking-wide">身份驗證成功</h2>
            <p className="text-emerald-400/90 text-sm text-center mb-8 font-medium">
              歡迎回來！為了您的帳號安全，<br/>請重新設定您的登入密碼。
            </p>

            {resetError && (
              <div className="w-full mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center leading-relaxed font-medium">
                {resetError}
              </div>
            )}

            <div className="w-full relative mb-8">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
              <input
                type="password"
                value={newPassword}
                onChange={e => { setResetError(''); setNewPassword(e.target.value); }}
                onKeyDown={e => e.key === 'Enter' && handleForceReset()}
                placeholder="請輸入新密碼 (至少 6 碼)"
                className="w-full bg-black/40 border border-emerald-500/40 rounded-xl pl-12 pr-4 py-4 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner"
              />
            </div>

            <button
              type="button"
              onClick={handleForceReset}
              disabled={newPassword.length < 6 || resetLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm tracking-wide shadow-lg shadow-emerald-500/20"
            >
              {resetLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-900" /> : '確認重設並進入 App'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}