import React, { useState, useEffect } from 'react';
import { Compass, MessageCircle, Bell, User, Ghost } from 'lucide-react';
import { Tab } from '@/types';
import { useApp } from '@/context/AppContext';
import ExploreTab from '@/components/explore/ExploreTab';
import ChatList from '@/components/chat/ChatList';
import ChatRoom from '@/components/chat/ChatRoom';
import NotificationsTab from '@/components/notifications/NotificationsTab'; 
import ProfileView from '@/components/profile/ProfileView';
import PaywallModal from '@/components/PaywallModal';
import { Conversation } from '@/types';
// ✅ 匯入封鎖名單元件 (請確保剛才的 BlockedUsersList.tsx 已經建在 profile 資料夾下)
import BlockedUsersList from '@/components/profile/BlockedUsersList';

export default function MainApp() {
  const { stealthMode, unreadInbox, unreadChat, showPaywall, setShowPaywall } = useApp();
  
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [activeChatConvo, setActiveChatConvo] = useState<Conversation | null>(null);
  const [visualInboxCount, setVisualInboxCount] = useState(unreadInbox);

  // ✅ 新增狀態：用來控制是否顯示封鎖名單 (給 ProfileView 裡面的設定按鈕呼叫)
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

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
      {stealthMode && (
        <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-4 py-1.5 flex items-center gap-2 z-10">
          <Ghost className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-violet-400/80 text-xs font-medium">隱身模式 —只有你按讚的人能看見你</span>
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'explore' && <ExploreTab />}
        {activeTab === 'chat' && !activeChatConvo && (
          <ChatList onOpenConvo={setActiveChatConvo} />
        )}
        {activeTab === 'chat' && activeChatConvo && (
          <ChatRoom convo={activeChatConvo} onBack={() => setActiveChatConvo(null)} />
        )}
        {activeTab === 'inbox' && <NotificationsTab />}
        
        {/* ✅ 將 setShowBlockedUsers 函數傳給 ProfileView，讓裡面的按鈕可以開啟封鎖名單 */}
        {activeTab === 'profile' && (
          <ProfileView onOpenBlockedUsers={() => setShowBlockedUsers(true)} />
        )}
      </div>

      {/* Bottom nav */}
      <nav className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/8 safe-area-bottom">
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
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-lg shadow-red-500/40">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  ) : null}
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

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      
      {/* ✅ 獨立掛載的封鎖名單 Modal，覆蓋在最上層 */}
      {showBlockedUsers && (
        <BlockedUsersList onBack={() => setShowBlockedUsers(false)} />
      )}
    </div>
  );
}