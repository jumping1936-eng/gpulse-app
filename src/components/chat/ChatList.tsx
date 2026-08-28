import React, { useEffect, useState } from 'react';
import { MessageCircle, User as UserIcon, Loader2 } from 'lucide-react';
import { Conversation, DBProfile } from '@/types';
import { supabase } from '@/supabaseClient';

interface Props {
  onOpenConvo: (c: Conversation) => void;
}

export default function ChatList({ onOpenConvo }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
    
    // 建立 Realtime 監聽器，當房間有新訊息時即時更新列表
    const channel = supabase
      .channel('public:conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations(); // 房間更新時重新撈取列表 (實務上可優化為局部更新)
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

      // 撈取與自己相關的房間，並 Join 雙方的 profile
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

      // 整理資料：判斷 user1 還是 user2 是對方
      const formattedConvos = data.map((convo: any) => {
        const isUser1 = convo.user1_id === user.id;
        const otherUser = isUser1 ? convo.user2 : convo.user1;
        
        return {
          id: convo.id,
          created_at: convo.created_at,
          user1_id: convo.user1_id,
          user2_id: convo.user2_id,
          last_message: convo.last_message || '尚未開始對話',
          last_message_time: convo.last_message_time,
          other_user: otherUser as DBProfile,
          unread: 0 // 未來可擴充未讀計數邏輯
        };
      });

      setConversations(formattedConvos);
    } catch (error) {
      console.error('🔴 讀取聊天列表失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-20">
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/8 px-6 py-4 z-10 flex items-center justify-between">
        <h1 className="text-white font-bold text-xl tracking-wide">訊息</h1>
      </div>

      <div className="divide-y divide-white/5">
        {conversations.map(convo => (
          <div
            key={convo.id}
            onClick={() => onOpenConvo(convo)}
            className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
          >
            {/* 真實大頭貼渲染 */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-900 shadow-md overflow-hidden flex items-center justify-center">
                {convo.other_user.avatar_url ? (
                  <img src={convo.other_user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-slate-500" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white text-base truncate">
                  {convo.other_user.full_name || '無名探索者'}
                </span>
                <span className="text-white/30 text-xs flex-shrink-0">
                  {new Date(convo.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-white/50 truncate">
                {convo.last_message}
              </p>
            </div>
          </div>
        ))}
      </div>

      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-32 gap-4 animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/40 text-sm font-medium">去探索頁面認識新朋友吧！</p>
        </div>
      )}
    </div>
  );
}