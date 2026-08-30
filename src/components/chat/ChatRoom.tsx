import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, ImageIcon, User as UserIcon, Timer, Check, CheckCheck, Flame, MoreVertical, ShieldOff, Lock, UserSquare2, Trash2, Bell } from 'lucide-react';
import { Conversation, Message } from '@/types';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import ProfileModal from '@/components/explore/ProfileModal';

interface Props {
  convo: Conversation;
  onBack: () => void;
}

const MessageBubble = ({ 
  msg, 
  isMe, 
  onSelfDestruct 
}: { 
  msg: Message & { is_vanish?: boolean }, 
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
          onSelfDestruct(msg.id); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [msg.is_vanish, msg.id, onSelfDestruct]);

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
  const { user: currentUser } = useAuth();
  const { setUnreadChat } = useApp();
  const myId = currentUser?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [vanishMode, setVanishMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetName = convo.other_user?.full_name || convo.name || '無名探索者';
  const targetAvatar = convo.other_user?.avatar_url || convo.avatar || '';

  const fetchMessagesAndMarkRead = useCallback(async () => {
    if (!myId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convo.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
      const unreadIds = data.filter(m => m.sender_id !== myId && !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      }
    }
  }, [convo.id, myId]);

  const setupRealtime = useCallback(() => {
    supabase.channel(`room:${convo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` }, (payload) => {
        const newMsg = payload.new as Message & { is_hidden?: boolean };
        if (newMsg.is_hidden) return;

        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.sender_id !== myId) {
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` }, (payload) => {
        if (payload.new.is_hidden) {
          setMessages(prev => prev.filter(m => m.id !== payload.new.id));
        } else {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .subscribe();
  }, [convo.id, myId]);

  useEffect(() => {
    setUnreadChat(0);

    if (myId) {
      fetchMessagesAndMarkRead();
      setupRealtime();
    }

    return () => {
      setUnreadChat(0);
      supabase.removeAllChannels();
    };
  }, [convo?.id, myId, fetchMessagesAndMarkRead, setupRealtime, setUnreadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!myId) {
      alert("⚠️ 無法獲取您的用戶身份，請重新登入！");
      return;
    }
    
    const content = input.trim();
    setInput('');

    try {
      // ⚡ Optimistic UI：立刻寫入並索取回傳資料
      const { data: newMsg, error: msgError } = await supabase.from('messages').insert({
        conversation_id: convo.id,
        sender_id: myId,
        content: content,
        is_read: false,
        is_vanish: vanishMode 
      }).select().single();
      
      // 🔴 總監防呆：如果 Supabase 報錯，直接強制跳窗讓您知道！
      if (msgError) {
        alert(`❌ 資料庫寫入失敗：\n${msgError.message}\n\n(請確認是否已在 Supabase 執行剛才的 SQL 補齊欄位)`);
        throw msgError;
      }

      setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);

      await supabase.from('conversations').update({
        last_message: vanishMode ? '🔥 [限時私密訊息]' : content,
        last_message_time: new Date().toISOString()
      }).eq('id', convo.id);
    } catch (error) {
      console.error('🔴 傳送訊息失敗:', error);
    }
  };

  const handleSelfDestruct = useCallback(async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await supabase.from('messages').update({ is_hidden: true }).eq('id', msgId);
  }, []);

  const handleClearChat = async () => {
    if (!convo.id) return;

    const confirmed = window.confirm('確定要刪除此聊天室的所有訊息嗎？（此動作無法復原）');
    if (!confirmed) return;

    const previousMessages = [...messages];
    setMenuOpen(false);
    setMessages([]);

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_hidden: true })
        .eq('conversation_id', convo.id)
        .or(`sender_id.eq.${myId},sender_id.is.null`);

      if (error) throw error;
      alert('已刪除此聊天室中的所有訊息。');
    } catch (error) {
      console.error('💥 刪除訊息失敗（soft delete）:', error);
      setMessages(previousMessages);
      alert('刪除訊息失敗，已恢復訊息內容。請稍後再試。');
    }
  };

  const handleBlockUser = async () => {
    if (!currentUser?.id || !convo.other_user?.id) return;
    setMenuOpen(false);
    try {
      const { error } = await supabase.from('blocked_users').insert({
        blocker_id: currentUser.id,
        blocked_id: convo.other_user.id,
      });

      if (error) throw error;
      alert(`${targetName} 已被加入封鎖名單。`);
    } catch (error) {
      console.error('封鎖失敗:', error);
      alert('封鎖失敗，請確認資料表存在或稍後再試。');
    }
  };

  const handleOpenPrivacyAccess = async () => {
    setMenuOpen(false);
    try {
      if (currentUser?.id && convo.other_user?.id) {
        const { error } = await supabase.from('notifications').insert({
          receiver_id: convo.other_user.id,
          sender_id: currentUser.id,
          type: 'album_request',
        });
        if (error) throw error;
      }
      alert('已向對方發送隱私相簿開放權限申請。');
    } catch (error) {
      console.error('開放權限失敗:', error);
      alert('開放權限請求失敗，請稍後再試。');
    }
  };

  const handleViewProfile = () => {
    setMenuOpen(false);
    setShowProfileModal(true);
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

        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);

        await supabase.from('conversations').update({
          last_message: vanishMode ? '🔥 [私密圖片]' : '[圖片]',
          last_message_time: new Date().toISOString()
        }).eq('id', convo.id);
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
            title="限時銷毀模式"
          >
            <Timer className="w-5 h-5" />
          </button>

          <div className="relative ml-2 inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="開啟更多選單"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                  刪除訊息
                </button>
                <button
                  type="button"
                  onClick={handleBlockUser}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                >
                  <ShieldOff className="h-4 w-4 text-amber-400" />
                  封鎖此人
                </button>
                <button
                  type="button"
                  onClick={handleOpenPrivacyAccess}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                >
                  <Lock className="h-4 w-4 text-violet-400" />
                  開放權限(隱私相簿)
                </button>
                <button
                  type="button"
                  onClick={handleViewProfile}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                >
                  <UserSquare2 className="h-4 w-4 text-cyan-400" />
                  查看個人檔案
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.08),_transparent_35%),linear-gradient(to_bottom,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]">
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
            id: convo.other_user?.id,
            full_name: targetName,
            avatar_url: targetAvatar,
            age: '25',
            status: 'online',
            tribe: 'relationship',
            bio: convo.other_user?.bio || '這個人目前還沒有留下更多介紹。',
            distance: '< 100m',
            isVIP: false,
            isVerified: false,
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
              placeholder={vanishMode ? "閱後即焚 (10秒)..." : "輸入訊息..."}
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