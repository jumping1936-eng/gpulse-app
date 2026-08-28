import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Timer, Send, ImageIcon, User as UserIcon } from 'lucide-react';
import { Conversation, Message } from '@/types';
import { supabase } from '@/supabaseClient';

interface Props {
  convo: Conversation;
  onBack: () => void;
}

export default function ChatRoom({ convo, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [vanishMode, setVanishMode] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    setupRealtime();
    return () => {
      supabase.removeAllChannels();
    };
  }, [convo.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMyId(user.id);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
  };

  const setupRealtime = () => {
    supabase
      .channel(`room:${convo.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          // 避免自己發送的訊息重複渲染
          setMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!input.trim() || !myId) return;
    const content = input.trim();
    setInput('');

    try {
      // 1. 寫入訊息表
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: convo.id,
        sender_id: myId,
        content: content,
        is_read: false
      });
      if (msgError) throw msgError;

      // 2. 更新房間最後對話狀態
      await supabase.from('conversations').update({
        last_message: content,
        last_message_time: new Date().toISOString()
      }).eq('id', convo.id);

    } catch (error) {
      console.error('🔴 傳送訊息失敗:', error);
    }
  };

  // ⚠️ 總監防呆建議：目前用 Base64 直接存入 TEXT 欄位。上線前建議改接 Supabase Storage 避免容量超載。
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      try {
        await supabase.from('messages').insert({
          conversation_id: convo.id,
          sender_id: myId,
          content: base64String,
          is_read: false
        });
        await supabase.from('conversations').update({
          last_message: '[圖片]',
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
    <div className="h-full flex flex-col bg-slate-950">
      {/* 頂部 Header */}
      <div className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/8 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={onBack} className="text-white/60 hover:text-white transition-colors p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center">
          {convo.other_user.avatar_url ? (
             <img src={convo.other_user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
             <UserIcon className="w-5 h-5 text-slate-500" />
          )}
        </div>
        <div className="flex-1">
          <span className="text-white font-bold text-sm tracking-wide">
            {convo.other_user.full_name || '無名探索者'}
          </span>
        </div>
      </div>

      {/* 訊息顯示區塊 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map(msg => {
          const isMe = msg.sender_id === myId;
          const isImage = msg.content.startsWith('data:image');
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%] space-y-1">
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe 
                      ? 'bg-gradient-to-br from-violet-600 to-blue-600 text-white rounded-br-sm shadow-md shadow-violet-500/20' 
                      : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                  } ${isImage ? 'p-1.5 bg-transparent border-0 shadow-none' : ''}`}
                >
                  {isImage ? (
                    <img src={msg.content} alt="Uploaded" className="w-full max-w-[220px] rounded-2xl object-cover border border-white/10" />
                  ) : (
                    msg.content
                  )}
                </div>
                <p className={`text-[10px] text-white/30 ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 輸入控制區塊 */}
      <div className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/8 px-4 py-4 safe-area-bottom">
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <ImageIcon className="w-5 h-5 text-white/60" />
          </button>
          
          <div className="flex-1 bg-white/5 border border-white/10 rounded-full flex items-center px-4 transition-colors focus-within:border-violet-500/50">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="輸入訊息..."
              className="flex-1 bg-transparent text-white placeholder-white/30 text-sm py-3 outline-none"
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:bg-slate-700 flex items-center justify-center flex-shrink-0 transition-colors shadow-lg shadow-violet-500/30 disabled:shadow-none"
          >
            <Send className="w-4 h-4 text-white ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}