import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, ImageIcon, User as UserIcon, Timer, Check, CheckCheck, Flame, MoreVertical, ShieldOff, Lock, UserSquare2, Trash2 } from 'lucide-react';
import { Conversation, Message } from '@/types';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import ProfileModal from '@/components/explore/ProfileModal';
import { PUBLIC_PROFILE_FIELDS } from '@/utils/profile';

interface Props {
  convo: Conversation;
  onBack: () => void;
}

type ChatMessage = Message & {
  is_hidden?: boolean;
  is_vanish?: boolean;
};

const isMessageVisible = (message: ChatMessage, clearedAt: string | null) => {
  if (message.is_hidden === true) return false;
  if (clearedAt === null) return true;

  return new Date(message.created_at).getTime() > new Date(clearedAt).getTime();
};

const MessageBubble = ({ 
  msg, 
  isMe, 
  onSelfDestruct 
}: { 
  msg: ChatMessage,
  isMe: boolean, 
  onSelfDestruct: (id: string) => void 
}) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const isImage = typeof msg.content === 'string' && msg.content.startsWith('data:image');

  useEffect(() => {
    if (!msg.is_vanish) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [msg.is_vanish, msg.id]);

  useEffect(() => {
    if (timeLeft === 0 && msg.is_vanish && isMe) {
      onSelfDestruct(msg.id);
    }
  }, [timeLeft, msg.is_vanish, msg.id, isMe, onSelfDestruct]);

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="max-w-[78%] space-y-1.5">
        <div className="flex items-end gap-2">
          <div className={`relative px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
              msg.is_vanish 
                ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                : isMe 
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20' 
                  : 'bg-slate-900/80 text-white/90 border border-white/10 shadow-lg shadow-slate-950/40'
            } ${isImage ? 'p-1 bg-transparent border-0 shadow-none' : ''}
            ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}
          `}>
            {isImage ? (
              <img src={msg.content} alt="Uploaded" className="w-full max-w-[220px] rounded-2xl object-cover border border-white/10" />
            ) : (
              msg.content
            )}
            
            {msg.is_vanish && (
              <div className={`absolute -top-2.5 ${isMe ? '-left-2.5' : '-right-2.5'} bg-slate-900 border border-pink-500/50 rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-lg`}>
                <Flame className="w-3 h-3 text-orange-400 animate-pulse" />
                <span className="text-[9px] font-bold text-pink-400">{timeLeft}s</span>
              </div>
            )}
          </div>
        </div>
        
        <div className={`flex items-center gap-1 text-[9px] text-white/30 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '剛剛'}</span>
          {isMe && (msg.is_read ? <CheckCheck className="w-3 h-3 text-cyan-400" /> : <Check className="w-3 h-3" />)}
        </div>
      </div>
    </div>
  );
};

export default function ChatRoom({ convo, onBack }: Props) {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const { setUnreadChat, blockUser, blockedUsers, blockListStatus } = useApp();
  const myId = currentUser?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [input, setInput] = useState('');
  const [vanishMode, setVanishMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [isClearingConversation, setIsClearingConversation] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalData, setProfileModalData] = useState<{
    id?: string;
    full_name?: string;
    avatar_url?: string;
    age?: string;
    tribe?: string;
    bio?: string;
    public_photos?: string[];
    height?: string;
    role?: string;
    looking_for?: string;
    distance?: string;
    isVIP?: boolean;
    isVerified?: boolean;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatRoomChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const clearedAtRef = useRef<string | null>(null);

  const targetName = convo.other_user?.full_name || t('common.unknownName', '尚未設定名稱');
  const targetAvatar = convo.other_user?.avatar_url || convo.avatar || '';

  useEffect(() => {
    clearedAtRef.current = clearedAt;
  }, [clearedAt]);

  const markMessagesRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    const { error } = await supabase.rpc('mark_messages_read', {
      message_ids: messageIds,
    });

    if (error) {
      console.error('🔴 標示已讀失敗:', error);
    }
  }, []);

  const fetchMessagesAndMarkRead = useCallback(async () => {
    if (!myId) return;

    try {
      const [memberStateResponse, messagesResponse] = await Promise.all([
        supabase
          .from('conversation_member_state')
          .select('cleared_at')
          .eq('conversation_id', convo.id)
          .eq('profile_id', myId)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convo.id)
          .order('created_at', { ascending: true }),
      ]);

      if (memberStateResponse.error) throw memberStateResponse.error;
      if (messagesResponse.error) throw messagesResponse.error;

      const nextClearedAt = memberStateResponse.data?.cleared_at ?? null;
      const visibleMessages = ((messagesResponse.data ?? []) as ChatMessage[])
        .filter(message => isMessageVisible(message, nextClearedAt));

      clearedAtRef.current = nextClearedAt;
      setClearedAt(nextClearedAt);
      setMessages(visibleMessages);
      setMessageError(null);
      const unreadIds = visibleMessages.filter(m => m.sender_id !== myId && !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
        await markMessagesRead(unreadIds);
      }
    } catch (error) {
      console.error('🔴 讀取訊息失敗:', error);
      setMessageError('無法載入訊息，請稍後再試。');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [convo.id, markMessagesRead, myId]);

  const setupRealtime = useCallback(() => {
    if (!convo.id) return;

    if (chatRoomChannel.current) {
      supabase.removeChannel(chatRoomChannel.current);
      chatRoomChannel.current = null;
    }

    const roomChannel = supabase.channel(`chat-room:${convo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        if (!isMessageVisible(newMsg, clearedAtRef.current)) return;

        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.sender_id !== myId) {
          void markMessagesRead([newMsg.id]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` }, (payload) => {
        const updatedMessage = payload.new as ChatMessage;
        if (!isMessageVisible(updatedMessage, clearedAtRef.current)) {
          setMessages(prev => prev.filter(m => m.id !== payload.new.id));
        } else {
          setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
        }
      });

    roomChannel.subscribe();
    chatRoomChannel.current = roomChannel;
  }, [convo.id, markMessagesRead, myId]);

  useEffect(() => {
    setUnreadChat(0);
    clearedAtRef.current = null;
    setClearedAt(null);
    setMessages([]);
    setIsLoadingMessages(Boolean(myId));

    if (myId) {
      void fetchMessagesAndMarkRead();
      setupRealtime();
    }

    return () => {
      setUnreadChat(0);
      if (chatRoomChannel.current) {
        supabase.removeChannel(chatRoomChannel.current);
        chatRoomChannel.current = null;
      }
    };
  }, [convo?.id, myId, fetchMessagesAndMarkRead, setupRealtime, setUnreadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (convo.other_user?.id && blockedUsers.has(convo.other_user.id)) {
      onBack();
    }
  }, [blockedUsers, convo.other_user?.id, onBack]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!myId) {
      alert("⚠️ 無法獲取您的用戶身份，請重新登入！");
      return;
    }

    if (blockListStatus !== 'ready') {
      alert('目前無法確認封鎖名單，暫時無法傳送訊息。');
      return;
    }

    if (blockedUsers.has(convo.other_user?.id)) {
      alert('你已封鎖此使用者，無法發送訊息。');
      return;
    }

    const content = input.trim();
    setInput('');

    try {
      const { data: newMsg, error: msgError } = await supabase.from('messages').insert({
        conversation_id: convo.id,
        sender_id: myId,
        content: content,
        is_read: false,
        is_vanish: vanishMode 
      }).select().single();
      
      // 🔴 總監防呆：如果 Supabase 報錯，直接強制跳窗讓您知道！
      if (msgError) {
        throw msgError;
      }

      const chatMessage = newMsg as ChatMessage;
      if (isMessageVisible(chatMessage, clearedAtRef.current)) {
        setMessages(prev => prev.find(m => m.id === chatMessage.id) ? prev : [...prev, chatMessage]);
      }

      try {
        const { error: conversationError } = await supabase.from('conversations').update({
          last_message: vanishMode ? '🔥 [限時私密訊息]' : content,
          last_message_time: new Date().toISOString()
        }).eq('id', convo.id);
        if (conversationError) throw conversationError;
      } catch (convoError) {
        console.error('🔴 更新對話預覽失敗:', convoError);
      }
    } catch (error) {
      console.error('🔴 傳送訊息失敗:', error);
      setInput(content);
      alert('訊息未傳送成功，內容已保留，請稍後再試。');
    }
  };

  const handleSelfDestruct = useCallback(async (msgId: string) => {
    const { data, error } = await supabase.rpc('hide_own_vanish_message', {
      message_id: msgId,
    });
    if (error) {
      console.error('🔴 限時訊息刪除失敗:', error);
      return;
    }

    if (data !== true) {
      console.warn('🔴 限時訊息沒有符合可隱藏條件:', msgId);
      return;
    }

    setMessages(prev => prev.filter(m => m.id !== msgId));
  }, []);

  const handleClearChat = async () => {
    if (isClearingConversation) return;

    setIsClearingConversation(true);
    setMessageError(null);

    try {
      const { data, error } = await supabase.rpc('clear_own_conversation', {
        target_conversation_id: convo.id,
      });

      if (error) throw error;
      if (typeof data !== 'string' || !data) {
        throw new Error('清除聊天後未收到有效的清除時間。');
      }

      clearedAtRef.current = data;
      setClearedAt(data);
      setMessages(prev => prev.filter(message => isMessageVisible(message, data)));
      setMenuOpen(false);
    } catch (error) {
      console.error('🔴 清除聊天失敗:', error);
      setMessageError('無法清除聊天紀錄，現有訊息未變更，請稍後再試。');
    } finally {
      setIsClearingConversation(false);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUser?.id || !convo.other_user?.id) return;
    setMenuOpen(false);
    try {
      await blockUser(convo.other_user.id);
      alert(`${targetName} 已被加入封鎖名單。`);
      onBack();
    } catch (error) {
      console.error('封鎖失敗:', error);
      alert('封鎖失敗，請確認資料表存在或稍後再試。');
    }
  };

  const handleViewProfile = async () => {
    setMenuOpen(false);
    if (!convo.other_user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PUBLIC_PROFILE_FIELDS)
        .eq('id', convo.other_user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      setShowProfileModal(true);
      setProfileModalData({
        id: data.id,
        full_name: data.full_name ?? targetName,
        avatar_url: data.avatar_url ?? targetAvatar,
        public_photos: Array.isArray(data.public_photos) ? data.public_photos : undefined,
        age: typeof data.age === 'number' ? String(data.age) : undefined,
        tribe: data.tribe,
        bio: data.bio,
        height: typeof data.height === 'number' ? String(data.height) : undefined,
        role: Array.isArray(data.role) ? data.role.join(', ') : data.role,
        looking_for: Array.isArray(data.looking_for) ? data.looking_for.join(', ') : data.looking_for,
        isVIP: data.is_vip,
        isVerified: data.is_vip,
      });
    } catch (error) {
      console.error('讀取使用者檔案失敗:', error);
      alert('無法載入使用者檔案，請稍後再試。');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myId) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      try {
        const { data: newMsg, error: msgError } = await supabase.from('messages').insert({
          conversation_id: convo.id,
          sender_id: myId,
          content: base64String,
          is_read: false,
          is_vanish: vanishMode 
        }).select().single();
        
        if (msgError) {
           alert(`❌ 圖片上傳失敗：${msgError.message}`);
           throw msgError;
        }

        const chatMessage = newMsg as ChatMessage;
        if (isMessageVisible(chatMessage, clearedAtRef.current)) {
          setMessages(prev => prev.find(m => m.id === chatMessage.id) ? prev : [...prev, chatMessage]);
        }

        try {
          const { error: conversationError } = await supabase.from('conversations').update({
            last_message: vanishMode ? '🔥 [私密圖片]' : '[圖片]',
            last_message_time: new Date().toISOString()
          }).eq('id', convo.id);
          if (conversationError) throw conversationError;
        } catch (convoError) {
          console.error('🔴 更新對話預覽失敗:', convoError);
        }
      } catch (err) {
        console.error('🔴 圖片傳送失敗:', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950">
      <div className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 px-3 py-3 flex items-center gap-2 z-10 shadow-lg shadow-slate-950/30">
        <button onClick={onBack} className="text-white/60 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5">
          <ArrowLeft className="w-5 h-5"/>
        </button>
        <div className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-md shadow-violet-500/10">
          {targetAvatar ? (
             <img src={targetAvatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
             <UserIcon className="w-4 h-4 text-slate-500"/>
          )}
        </div>
        <div className="flex-1 ml-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm tracking-wide">
              {targetName}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setVanishMode(!vanishMode)}
            className={`p-1.5 rounded-full transition-all duration-300 ${
              vanishMode
                ? 'bg-pink-500/20 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'
            }`}
            title={t('chat.vanishMode', '限時銷毀模式')}
          >
            <Timer className="w-5 h-5" />
          </button>

          <div className="relative ml-2 inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label={t('chat.more', '開啟更多選單')}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={handleClearChat}
                  disabled={isClearingConversation}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                  {isClearingConversation ? t('chat.clearing', '清除中…') : t('chat.clear', '清除聊天紀錄')}
                </button>
                <button
                  type="button"
                  onClick={handleBlockUser}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                >
                  <ShieldOff className="h-4 w-4 text-amber-400" />
                  {t('chat.block', '封鎖此人')}
                </button>
                <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-500">
                  <Lock className="h-4 w-4 text-violet-400" />
                  {t('chat.privateAlbumUnavailable', '私密相簿存取尚未開放')}
                </div>
                <button
                  type="button"
                  onClick={handleViewProfile}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                >
                  <UserSquare2 className="h-4 w-4 text-cyan-400" />
                  {t('chat.viewProfile', '查看個人檔案')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.08),_transparent_35%),linear-gradient(to_bottom,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]">
        {messageError && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-200">{messageError}</p>}
        {!isLoadingMessages && !messageError && messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center text-sm text-white/40">
            {t('chat.empty', '尚無新訊息')}
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble 
            key={msg.id} 
            msg={msg} 
            isMe={msg.sender_id === myId} 
            onSelfDestruct={handleSelfDestruct} 
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {showProfileModal && (
        <ProfileModal
          user={{
            id: profileModalData?.id ?? convo.other_user?.id,
            full_name: profileModalData?.full_name ?? targetName,
            avatar_url: profileModalData?.avatar_url ?? targetAvatar,
            public_photos: profileModalData?.public_photos,
            age: profileModalData?.age,
            tribe: profileModalData?.tribe,
            bio: profileModalData?.bio ?? convo.other_user?.bio,
            height: profileModalData?.height,
            role: profileModalData?.role,
            looking_for: profileModalData?.looking_for,
            distance: profileModalData?.distance,
            isVIP: profileModalData?.isVIP,
            isVerified: profileModalData?.isVerified,
          }}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      <div className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 safe-area-bottom z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <ImageIcon className="w-4 h-4 text-white/60"/>
          </button>
          
          <div className={`flex-1 border rounded-full flex items-center px-3 transition-all ${
            vanishMode 
              ? 'bg-pink-500/5 border-pink-500/30 focus-within:border-pink-500/60 shadow-[0_0_0_1px_rgba(236,72,153,0.2)]' 
              : 'bg-white/5 border-white/10 focus-within:border-violet-500/50'
          }`}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={vanishMode ? t('chat.vanishPlaceholder', '閱後即焚（10 秒）…') : t('chat.placeholder', '輸入訊息…')}
              className={`flex-1 bg-transparent text-[13px] py-2 outline-none transition-colors ${
                vanishMode ? 'text-pink-100 placeholder-pink-500/50' : 'text-white placeholder-white/30'
              }`}
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`w-9 h-9 rounded-full disabled:opacity-50 disabled:bg-slate-700 flex items-center justify-center flex-shrink-0 transition-all shadow-lg disabled:shadow-none ${
              vanishMode 
                ? 'bg-pink-600 hover:bg-pink-500 shadow-pink-500/30' 
                : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-violet-500/30'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-white ml-0.5"/>
          </button>
        </div>
      </div>
    </div>
  );
}
