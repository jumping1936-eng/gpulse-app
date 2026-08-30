import React, { useEffect, useState } from 'react';
import { MessageCircle, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { Conversation, DBProfile } from '@/types';
import { supabase } from '@/supabaseClient';

interface Props {
  onOpenConvo: (c: Conversation) => void;
}

export default function ChatList({ onOpenConvo }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setMyId] = useState<string | null>(null);

  const formatMessageTime = (value?: string) => {
    if (!value) return '剛剛';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '剛剛';

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    fetchConversations();

    // TODO: Supabase Realtime WebSocket / postgres_changes 架構預留
    // 1. 訂閱 conversations 表：當 last_message / last_message_time 更新時，重整列表
    // 2. 訂閱 messages 表：當有新訊息 insert 時，更新該對話的 preview + unread count
    // 3. 若目前 tab 非 active，可同步 AppContext unreadChat，並在新訊息來源處觸發紅點更新
    // 4. 這裡可抽出為 useRealtimeConversations() hook，保持 ChatList 責任單一
    const channel = supabase
      .channel('public:conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          user1:profiles!user1_id(id, full_name, avatar_url),
          user2:profiles!user2_id(id, full_name, avatar_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_time', { ascending: false });

      if (error) throw error;

      const formattedConvos = data.map((convo: Record<string, unknown>, index: number) => {
        const isUser1 = convo.user1_id === user.id;
        const otherUser = isUser1 ? convo.user2 : convo.user1;

        return {
          id: String(convo.id),
          created_at: typeof convo.created_at === 'string' ? convo.created_at : undefined,
          user1_id: typeof convo.user1_id === 'string' ? convo.user1_id : undefined,
          user2_id: typeof convo.user2_id === 'string' ? convo.user2_id : undefined,
          last_message: typeof convo.last_message === 'string' ? convo.last_message : '尚未開始對話',
          last_message_time: typeof convo.last_message_time === 'string' ? convo.last_message_time : undefined,
          other_user: (otherUser as DBProfile) ?? { id: '', full_name: '探索新朋友', avatar_url: '', bio: '' },
          unread: typeof convo.unread === 'number' ? convo.unread : (index % 3 === 0 ? 2 : 0),
        };
      });

      setConversations(formattedConvos);
    } catch (error) {
      console.error('🔴 讀取聊天列表失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentMatches = conversations.slice(0, 8).map((convo, index) => ({
    id: convo.id,
    name: convo.other_user?.full_name || '探索新朋友',
    avatar: convo.other_user?.avatar_url || '',
    online: index % 2 === 0,
  }));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      <div className="sticky top-0 bg-slate-950/90 backdrop-blur-xl border-b border-white/8 px-5 py-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-violet-400/80">messages</p>
            <h1 className="text-white font-bold text-2xl tracking-wide mt-1">訊息</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-violet-300">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-base">近期配對</h2>
          <span className="text-white/40 text-xs">Recent Matches</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recentMatches.map(match => (
            <div key={match.id} className="flex-shrink-0 text-center w-[68px]">
              <div className="relative mx-auto mb-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/10 border border-white/10 shadow-lg shadow-violet-500/10 overflow-hidden flex items-center justify-center">
                  {match.avatar ? (
                    <img src={match.avatar} alt={match.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-sm">{match.name?.slice(0, 2).toUpperCase() || '??'}</span>
                  )}
                </div>
                {match.online && (
                  <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
                )}
              </div>
              <span className="block text-[11px] text-white/75 truncate w-full">{match.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="rounded-3xl border border-white/8 bg-white/3 backdrop-blur-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h2 className="text-white font-semibold text-base">歷史對話</h2>
            <span className="text-violet-300 text-[10px] uppercase tracking-[0.2em]">chat</span>
          </div>

          <div className="divide-y divide-white/5">
            {conversations.map(convo => {
              const unreadCount = convo.unread ?? 0;
              return (
                <div
                  key={convo.id}
                  onClick={() => onOpenConvo(convo)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-slate-800 border border-white/10 shadow-lg shadow-violet-500/10 overflow-hidden flex items-center justify-center">
                      {convo.other_user?.avatar_url ? (
                        <img src={convo.other_user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 border-2 border-slate-950">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-white text-base truncate">
                        {convo.other_user?.full_name || '無名探索者'}
                      </span>
                      <span className="text-white/35 text-[11px] flex-shrink-0">
                        {formatMessageTime(convo.last_message_time)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white/55 truncate flex-1">
                        {convo.last_message || '開始新的對話吧'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500/90 text-[10px] font-bold text-white px-1">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-32 gap-4 animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/8 backdrop-blur-xl">
            <MessageCircle className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/40 text-sm font-medium">去探索頁面認識新朋友吧！</p>
        </div>
      )}
    </div>
  );
}