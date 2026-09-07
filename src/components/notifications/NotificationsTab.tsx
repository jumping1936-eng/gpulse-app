import React, { useState, useEffect } from 'react';
import { Heart, Mail, UserPlus, Lock, Loader2, Inbox, Sparkles } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export default function NotificationsTab() {
  const { user } = useAuth();
  const { setUnreadInbox } = useApp();
  const [activeTab, setActiveTab] = useState<'interaction' | 'system'>('interaction');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    created_at: string;
    sender?: { id?: string; full_name?: string; avatar_url?: string };
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchNotifications = React.useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`id, type, created_at, sender:sender_id (id, full_name, avatar_url)`)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications((data ?? []) as Array<{ id: string; type: string; created_at: string; sender?: { id?: string; full_name?: string; avatar_url?: string } }>);
      setErrorMessage(null);
    } catch (err) {
      console.error('🔴 獲取通知失敗:', err);
      setNotifications([]);
      setErrorMessage('無法載入通知，請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setUnreadInbox(0);
    fetchNotifications();

    return () => {
      setUnreadInbox(0);
    };
  }, [fetchNotifications, setUnreadInbox]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-list:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${user.id}` },
        () => { void fetchNotifications(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, user?.id]);

  const systemNotifications = notifications.filter((item) =>
    item.type === 'system' || item.type === 'welcome' || item.type === 'security' || item.type === 'update'
  );

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : '??';
  const getGradient = (id: string = '') => {
    const gradients = ['from-pink-500 to-rose-500', 'from-cyan-400 to-blue-500', 'from-violet-500 to-fuchsia-500'];
    return gradients[(id.charCodeAt(0) || 0) % gradients.length];
  };

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes || 1} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    return `${Math.floor(hours / 24)} 天前`;
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col font-sans text-white relative">
      <div className="pt-5 pb-4 px-4 shrink-0 sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/8 z-20">
        <h1 className="text-2xl font-bold tracking-wider mb-5">通知</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('interaction')}
            className={`flex-1 py-3 px-4 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 ${
              activeTab === 'interaction' ? 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-pink-400/50 text-white' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'interaction' ? 'fill-current' : ''}`} /> 互動
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-3 px-4 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 ${
              activeTab === 'system' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-purple-300/50 text-white' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Mail className="w-4 h-4" /> 系統
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar relative px-4 pb-5">
        {activeTab === 'interaction' && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                <span className="text-sm">載入通知中...</span>
              </div>
            ) : errorMessage ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 text-rose-300 text-center px-6">
                <Inbox className="w-12 h-12" />
                <span className="text-sm">{errorMessage}</span>
                <button onClick={() => void fetchNotifications()} className="rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200">重試</button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500 opacity-60">
                <Inbox className="w-12 h-12" />
                <span className="text-sm">目前還沒有收到任何互動喔</span>
              </div>
            ) : (
              notifications.map((notif) => {
                const sender = notif.sender || {};
                const senderName = typeof sender.full_name === 'string' ? sender.full_name : '未設定名稱';

                let message = '傳送了通知';
                let IconComponent = Heart;
                let iconColor = 'text-pink-500';
                
                if (notif.type === 'like') { message = '對你發送了心動！'; IconComponent = Heart; iconColor = 'text-pink-500'; }
                else if (notif.type === 'album_request') { message = '申請查看你的私密相簿！'; IconComponent = Lock; iconColor = 'text-amber-400'; }
                else if (notif.type === 'match') { message = '與你配對成功！'; IconComponent = UserPlus; iconColor = 'text-cyan-400'; }

                return (
                  <div key={notif.id} className="flex items-center gap-4 py-4 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group">
                    <div className={`relative w-12 h-12 rounded-full ${!sender.avatar_url ? `bg-gradient-to-br ${getGradient(sender.id)}` : 'bg-slate-800'} flex items-center justify-center shrink-0 overflow-hidden`}>
                      {sender.avatar_url ? (
                         <img src={sender.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                         <span className="text-white font-bold tracking-tighter">{getInitials(senderName)}</span>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center border-2 border-[#0B0C10] z-10">
                         <IconComponent className={`w-2.5 h-2.5 ${iconColor} fill-current`} />
                      </div>
                    </div>
                    
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-bold text-slate-200">{senderName}</span>
                      <span className="text-xs text-slate-400 mt-0.5 line-clamp-1">{message}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{formatTimeAgo(notif.created_at)}</span>
                  </div>
                );
              })
            )}
            <div className="h-24" />
          </div>
        )}

        {activeTab === 'system' && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-300 pt-4">
            {systemNotifications.length === 0 ? (
              errorMessage ? (
                <div className="flex flex-col items-center justify-center h-[420px] gap-4 text-rose-300 text-center px-6">
                  <Inbox className="w-12 h-12" />
                  <span className="text-sm">{errorMessage}</span>
                  <button onClick={() => void fetchNotifications()} className="rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200">重試</button>
                </div>
              ) : (
              <div className="flex flex-col items-center justify-center h-[420px] rounded-[28px] border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900 to-sky-500/10 text-center px-6 shadow-[0_20px_60px_rgba(76,29,149,0.22)]">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 text-violet-200 shadow-lg shadow-violet-500/20">
                  <Sparkles className="h-8 w-8" />
                </div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-violet-300/75">system status</p>
                <h3 className="mt-3 text-2xl font-bold text-white">訊息中心是空的</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-300">目前還沒有系統公告或安全更新。</p>
              </div>
              )
            ) : (
              systemNotifications.map((notif) => (
                <div key={notif.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 mb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-blue-500/25 text-violet-200">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">系統更新</div>
                        <div className="text-[11px] text-slate-400">{formatTimeAgo(notif.created_at)}</div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{notif.type === 'system' ? '系統已同步更新，帳號與安全狀態正常。' : '重要提醒：請保持個人資料與隱私設定最新。'}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
