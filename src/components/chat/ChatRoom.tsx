import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, ImageIcon, User as UserIcon, Timer, Check, CheckCheck, Flame } from 'lucide-react';
import { Conversation, Message } from '@/types';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext'; // ✅ 總監導入：直接使用全域 Auth 狀態，拒絕非同步延遲！

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
      <div className="max-w-[75%] space-y-1">
        <div className="flex items-end gap-2">
          <div className={`relative px-4 py-2 rounded-2xl text-[13px] leading-relaxed ${
              msg.is_vanish 
                ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                : isMe 
                  ? 'bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-md' 
                  : 'bg-white/10 text-white/90 border border-white/5'
            } ${isImage ? 'p-1 bg-transparent border-0 shadow-none' : ''}
            ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}
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
  // ✅ 使用全域 Auth 取代原本的 useState，確保一進畫面就擁有自己的 ID
  const { user: currentUser } = useAuth();
  const myId = currentUser?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [vanishMode, setVanishMode] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetName = convo.other_user?.full_name || (convo as any).name || '無名探索者';
  const targetAvatar = convo.other_user?.avatar_url || (convo as any).avatar || '';

  useEffect(() => {
    if (myId) {
      fetchMessagesAndMarkRead();
      setupRealtime();
    }
    return () => { supabase.removeAllChannels(); };
  }, [convo?.id, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessagesAndMarkRead = async () => {
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
  };

  const setupRealtime = () => {
    supabase.channel(`room:${convo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` }, (payload) => {
        const newMsg = payload.new as Message;
        if ((newMsg as any).is_hidden) return;
        
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
  };

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
    <div className="absolute inset-0 flex flex-col bg-[#0B0C10]">
      <div className="flex-shrink-0 bg-[#0B0C10]/95 backdrop-blur-xl border-b border-white/5 px-3 py-2 flex items-center gap-2 z-10">
        <button onClick={onBack} className="text-white/60 hover:text-white transition-colors p-1.5">
          <ArrowLeft className="w-5 h-5"/>
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shadow-sm">
          {targetAvatar ? (
             <img src={targetAvatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
             <UserIcon className="w-4 h-4 text-slate-500"/>
          )}
        </div>
        <div className="flex-1 ml-1">
          <span className="text-white font-bold text-sm tracking-wide">
            {targetName}
          </span>
        </div>
        
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
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
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

      <div className="flex-shrink-0 bg-[#0B0C10]/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 safe-area-bottom z-20">
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <ImageIcon className="w-4 h-4 text-white/60"/>
          </button>
          
          <div className={`flex-1 border rounded-full flex items-center px-3 transition-colors ${
            vanishMode 
              ? 'bg-pink-500/5 border-pink-500/30 focus-within:border-pink-500/60' 
              : 'bg-white/5 border-white/10 focus-within:border-violet-500/50'
          }`}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={vanishMode ? "閱後即焚 (10秒)..." : "輸入訊息..."}
              className={`flex-1 bg-transparent text-[13px] py-1.5 outline-none transition-colors ${
                vanishMode ? 'text-pink-100 placeholder-pink-500/50' : 'text-white placeholder-white/30'
              }`}
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`w-8 h-8 rounded-full disabled:opacity-50 disabled:bg-slate-700 flex items-center justify-center flex-shrink-0 transition-colors shadow-lg disabled:shadow-none ${
              vanishMode 
                ? 'bg-pink-600 hover:bg-pink-500 shadow-pink-500/30' 
                : 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/30'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-white ml-0.5"/>
          </button>
        </div>
      </div>
    </div>
  );
}