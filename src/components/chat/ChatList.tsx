import React, { useEffect, useState, useCallback } from 'react';
import { MessageCircle, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { Conversation, DBProfile } from '@/types';
import { supabase } from '@/supabaseClient';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  onOpenConvo: (c: Conversation) => void;
}

type MemberState = {
  conversation_id: string;
  cleared_at: string | null;
};

type PreviewMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_hidden: boolean | null;
  is_vanish: boolean | null;
};

const isMessageVisible = (message: PreviewMessage, clearedAt: string | null): boolean => {
  if (message.is_hidden === true) return false;
  if (clearedAt === null) return true;

  return new Date(message.created_at).getTime() > new Date(clearedAt).getTime();
};

const formatPreview = (message: PreviewMessage, t: (key: string, fallback: string) => string): string => {
  if (message.is_vanish === true) return `🔥 [${t('chat.vanishPreview', '限時私密訊息')}]`;
  if (message.content.startsWith('data:image')) return `[${t('chat.imagePreview', '圖片')}]`;
  return message.content;
};

export default function ChatList({ onOpenConvo }: Props) {
  const { locale, t } = useLanguage();
  const { setUnreadChat, blockedUsers } = useApp();
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnreadChat(0);
  }, [setUnreadChat]);

  const formatMessageTime = (value?: string): string | null => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const fetchConversations = useCallback(async () => {
    try {
      if (!currentUser) {
        setConversations([]);
        setUnreadChat(0);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          user1:profiles!user1_id(id, full_name, avatar_url),
          user2:profiles!user2_id(id, full_name, avatar_url)
        `)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order('last_message_time', { ascending: false });

      if (error) throw error;

      const conversationRows = data ?? [];
      const conversationIds = conversationRows
        .map((convo: Record<string, unknown>) => typeof convo.id === 'string' ? convo.id : null)
        .filter((id): id is string => id !== null);

      if (conversationIds.length === 0) {
        setConversations([]);
        setUnreadChat(0);
        return;
      }

      const [memberStateResponse, messagesResponse] = await Promise.all([
        supabase
          .from('conversation_member_state')
          .select('conversation_id, cleared_at')
          .eq('profile_id', currentUser.id)
          .in('conversation_id', conversationIds),
        supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, created_at, is_read, is_hidden, is_vanish')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false }),
      ]);

      if (memberStateResponse.error) throw memberStateResponse.error;
      if (messagesResponse.error) throw messagesResponse.error;

      const clearedAtByConversation = new Map<string, string | null>();
      for (const state of (memberStateResponse.data ?? []) as MemberState[]) {
        clearedAtByConversation.set(state.conversation_id, state.cleared_at);
      }

      const newestVisibleMessageByConversation = new Map<string, PreviewMessage>();
      const unreadByConversation = new Map<string, number>();
      for (const message of (messagesResponse.data ?? []) as PreviewMessage[]) {
        const clearedAt = clearedAtByConversation.get(message.conversation_id) ?? null;
        if (!isMessageVisible(message, clearedAt)) continue;

        if (!newestVisibleMessageByConversation.has(message.conversation_id)) {
          newestVisibleMessageByConversation.set(message.conversation_id, message);
        }

        if (message.sender_id !== currentUser.id && !message.is_read) {
          unreadByConversation.set(
            message.conversation_id,
            (unreadByConversation.get(message.conversation_id) ?? 0) + 1,
          );
        }
      }

      const formattedConvos = conversationRows
        .map((convo: Record<string, unknown>): Conversation | null => {
          const isUser1 = (convo.user1_id as string) === currentUser.id;
          const otherUser = isUser1 ? (convo.user2 as Record<string, unknown>) : (convo.user1 as Record<string, unknown>);

          const otherUserId = typeof otherUser?.id === 'string' ? otherUser.id : null;
          const isDeletedConversation = otherUserId === null;
          if (!isDeletedConversation && blockedUsers.has(otherUserId)) return null;

          const conversationId = String(convo.id);
          const previewMessage = newestVisibleMessageByConversation.get(conversationId);
          return {
            id: conversationId,
            created_at: typeof convo.created_at === 'string' ? convo.created_at : undefined,
            user1_id: typeof convo.user1_id === 'string' ? convo.user1_id : undefined,
            user2_id: typeof convo.user2_id === 'string' ? convo.user2_id : undefined,
            last_message: previewMessage ? formatPreview(previewMessage, t) : undefined,
            last_message_time: previewMessage?.created_at,
            other_user: (otherUser as DBProfile | null) ?? null,
            unread: unreadByConversation.get(conversationId) ?? 0,
          };
        })
        .filter((convo): convo is Conversation => convo !== null)
        .sort((left, right) => {
          const leftTime = left.last_message_time ? new Date(left.last_message_time).getTime() : 0;
          const rightTime = right.last_message_time ? new Date(right.last_message_time).getTime() : 0;
          return rightTime - leftTime;
        });

      setConversations(formattedConvos);
      setUnreadChat(formattedConvos.reduce((total, convo) => total + (convo.unread ?? 0), 0));
    } catch (error) {
      console.error('🔴 讀取聊天列表失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [blockedUsers, currentUser, setUnreadChat, t]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`chat-list:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_member_state', filter: `profile_id=eq.${currentUser.id}` },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchConversations]);

  const recentMatches = conversations.slice(0, 8).map((convo) => ({
    id: convo.id,
    name: convo.other_user?.full_name || t('chat.deletedUser', '已刪除帳號'),
    avatar: convo.other_user?.avatar_url || '',
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
            <h1 className="text-white font-bold text-2xl tracking-wide mt-1">{t('chat.title', '訊息')}</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-violet-300">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-base">{t('chat.recentMatches', '近期配對')}</h2>
          <span className="text-white/40 text-xs">{t('chat.recentMatches', '近期配對')}</span>
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
              </div>
              <span className="block text-[11px] text-white/75 truncate w-full">{match.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="rounded-3xl border border-white/8 bg-white/3 backdrop-blur-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h2 className="text-white font-semibold text-base">{t('chat.history', '歷史對話')}</h2>
            <span className="text-violet-300 text-[10px] uppercase tracking-[0.2em]">chat</span>
          </div>

          <div className="divide-y divide-white/5">
            {conversations.map(convo => {
              const unreadCount = convo.unread ?? 0;
              return (
                <div
                  key={convo.id}
                  onClick={() => {
                    setUnreadChat(0);
                    setConversations(prev => prev.map(item => item.id === convo.id ? { ...item, unread: 0 } : item));
                    onOpenConvo(convo);
                  }}
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
                        {convo.other_user?.full_name || t('chat.deletedUser', '已刪除帳號')}
                      </span>
                      {formatMessageTime(convo.last_message_time) && <span className="text-white/35 text-[11px] flex-shrink-0">
                        {formatMessageTime(convo.last_message_time)}
                      </span>}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white/55 truncate flex-1">
                        {convo.last_message || t('chat.empty', '尚無新訊息')}
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
          <p className="text-white/40 text-sm font-medium">{t('chat.emptyHint', '去探索頁面認識新朋友吧！')}</p>
        </div>
      )}
    </div>
  );
}
