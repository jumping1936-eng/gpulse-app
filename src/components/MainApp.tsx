import React, { useState, useEffect } from 'react';
import { Home, Compass, MessageCircle, Bell, User, Ghost } from 'lucide-react';
import { Tab, Conversation } from '@/types';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext'; 

import HomeFeed from '@/components/home/HomeFeed';
import ExploreTab from '@/components/explore/ExploreTab';
import ChatList from '@/components/chat/ChatList';
import ChatRoom from '@/components/chat/ChatRoom';
import NotificationsTab from '@/components/notifications/NotificationsTab'; 
import ProfileView from '@/components/profile/ProfileView';
import PaywallModal from '@/components/PaywallModal';
import BlockedUsersList from '@/components/profile/BlockedUsersList';
import { supabase } from '@/supabaseClient'; 

export default function MainApp() {
  const { stealthMode, unreadInbox, setUnreadInbox, unreadChat, setUnreadChat, showPaywall, setShowPaywall } = useApp();
  const { user: currentUser } = useAuth(); 
  
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [activeChatConvo, setActiveChatConvo] = useState<Conversation | null>(null);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

  // ✅ 總監重構：透過 RPC 取得真實房間 ID 後再進行跳轉
  useEffect(() => {
    const handleJumpToChat = async (e: Event & { detail?: { id?: string; other_user?: { id?: string } } }) => {
      const targetUser = e.detail?.other_user || e.detail;
      if (!currentUser || !targetUser?.id) return;

      try {
        let realRoomId: string | null = null;

        try {
          const { data, error } = await supabase.rpc('get_or_create_conversation', { other_id: targetUser.id });
          if (error) throw error;
          realRoomId = typeof data === 'string' ? data : null;
        } catch (rpcError) {
          console.warn('RPC get_or_create_conversation 不可用，改為手動建立對話:', rpcError);

          const { data: existingConvo, error: fetchErr } = await supabase
            .from('conversations')
            .select('*')
            .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${currentUser.id})`)
            .limit(1)
            .maybeSingle();

          if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

          if (existingConvo) {
            realRoomId = existingConvo.id;
          } else {
            const { data: createdConvo, error: insertErr } = await supabase
              .from('conversations')
              .insert({
                user1_id: currentUser.id,
                user2_id: targetUser.id,
                last_message: '',
                last_message_time: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (insertErr) throw insertErr;
            realRoomId = createdConvo.id;
          }
        }

        const { data: convoData, error: convoError } = await supabase
          .from('conversations')
          .select(`
            *,
            user1:profiles!user1_id(id, full_name, avatar_url),
            user2:profiles!user2_id(id, full_name, avatar_url)
          `)
          .eq('id', realRoomId)
          .single();

        if (convoError) throw convoError;

        const otherUser = convoData.user1_id === currentUser.id ? convoData.user2 : convoData.user1;

        setActiveTab('chat');
        setActiveChatConvo({
          id: convoData.id,
          created_at: convoData.created_at,
          user1_id: convoData.user1_id,
          user2_id: convoData.user2_id,
          last_message: convoData.last_message || '開始新的對話吧',
          last_message_time: convoData.last_message_time || new Date().toISOString(),
          unread: 0,
          other_user: (otherUser || targetUser) as Conversation['other_user'],
        } as Conversation);
      } catch (err) {
        console.error('🔴 無法建立或讀取聊天室:', err);
        alert('建立聊天室連線失敗，請確認資料庫狀態。');
      }
    };

    window.addEventListener('jump-to-chat', handleJumpToChat);
    return () => window.removeEventListener('jump-to-chat', handleJumpToChat);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const notificationChannel = supabase
      .channel('realtime-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${currentUser.id}` },
        () => {
          if (activeTab !== 'inbox') setUnreadInbox(unreadInbox + 1);
        }
      ).subscribe();
    return () => { supabase.removeChannel(notificationChannel); };
  }, [currentUser, activeTab, unreadInbox, setUnreadInbox]);

  const tabs = [
    { id: 'home' as Tab, icon: Home, label: '首頁' },
    { id: 'explore' as Tab, icon: Compass, label: '探索' },
    { id: 'chat' as Tab, icon: MessageCircle, label: '聊天', badge: unreadChat },
    { id: 'inbox' as Tab, icon: Bell, label: '通知', badge: unreadInbox },
    { id: 'profile' as Tab, icon: User, label: '個人' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0C10] flex flex-col max-w-md mx-auto relative">
      {stealthMode && (
        <div className="bg-[#0B0C10]/80 backdrop-blur-xl border-b border-white/5 px-4 py-1.5 flex items-center gap-2 z-10">
          <Ghost className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-violet-400/80 text-xs font-medium">隱身模式 —只有你按讚的人能看見你</span>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'home' && <HomeFeed />}
        {activeTab === 'explore' && <ExploreTab />}
        {activeTab === 'chat' && !activeChatConvo && <ChatList onOpenConvo={setActiveChatConvo} />}
        {activeTab === 'chat' && activeChatConvo && <ChatRoom convo={activeChatConvo} onBack={() => setActiveChatConvo(null)} />}
        {activeTab === 'inbox' && <NotificationsTab />}
        {activeTab === 'profile' && <ProfileView onOpenBlockedUsers={() => setShowBlockedUsers(true)} />}
      </div>

      <nav className="flex-shrink-0 bg-[#0B0C10]/95 backdrop-blur-xl border-t border-white/8 safe-area-bottom z-40 relative">
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
                  if (tab.id === 'inbox') setUnreadInbox(0);
                  if (tab.id === 'chat') setUnreadChat(0);
                }}
                className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all group pointer-events-auto"
              >
                <div className={`relative transition-all duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
                  <Icon className={`w-6 h-6 transition-all duration-200 ${active ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]' : 'text-white/35 group-hover:text-white/60'}`} strokeWidth={active ? 2.5 : 1.8} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                     <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#0B0C10] animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-all duration-200 ${active ? 'text-violet-400' : 'text-white/25'}`}>{tab.label}</span>
                {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />}
              </button>
            );
          })}
        </div>
      </nav>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      {showBlockedUsers && <BlockedUsersList onBack={() => setShowBlockedUsers(false)} />}
    </div>
  );
}