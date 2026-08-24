import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Lock, Timer, Send, BadgeCheck, Crown, Image as ImageIcon } from 'lucide-react';
import { Conversation, Message } from '@/types';

interface Props {
  convo: Conversation;
  onBack: () => void;
}

export default function ChatRoom({ convo, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1', senderId: convo.user.id, content: '嘿！今天過得怎麼樣？ 😊',
      timestamp: new Date(Date.now() - 3600000), isVanish: false, revealed: true, removed: false,
    },
    {
      id: 'm2', senderId: 'me', content: '還不錯！剛從健身房回來 💪',
      timestamp: new Date(Date.now() - 3500000), isVanish: false, revealed: true, removed: false,
    },
    {
      id: 'm3', senderId: convo.user.id, content: '🔥🔥🔥',
      timestamp: new Date(Date.now() - 3400000), isVanish: false, revealed: true, removed: false,
    },
  ]);
  const [input, setInput] = useState('');
  const [vanishMode, setVanishMode] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // ✅ 總監新增：用來觸發隱藏檔案上傳的 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      senderId: 'me',
      content: input.trim(),
      timestamp: new Date(),
      isVanish: vanishMode,
      revealed: !vanishMode,
      removed: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
  }

  // ✅ 總監新增：處理圖片選擇與本機預覽 (Base64)
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      const newMsg: Message = {
        id: `img${Date.now()}`,
        senderId: 'me',
        content: base64String, // 將圖片 Base64 當作訊息內容儲存
        timestamp: new Date(),
        isVanish: vanishMode,
        revealed: !vanishMode,
        removed: false,
      };
      setMessages(prev => [...prev, newMsg]);
    };
    // 讀取檔案為 Data URL (Base64)
    reader.readAsDataURL(file);
    
    // 清空 input，確保下次選同一張照片也能觸發 onChange
    e.target.value = '';
  }

  function revealMessage(id: string) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, revealed: true } : m));
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, removed: true } : m));
    }, 3000);
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/8 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${convo.user.gradientFrom} ${convo.user.gradientTo} flex items-center justify-center`}>
          <span className="text-white font-bold text-sm">{convo.user.initials}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold text-sm">{convo.user.name}</span>
            {convo.user.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />}
            {convo.user.isVIP && <Crown className="w-3 h-3 text-amber-400" />}
          </div>
          <p className={`text-xs ${convo.user.lastSeen === 'Online' ? 'text-emerald-400' : 'text-white/35'}`}>
            {convo.user.lastSeen}
          </p>
        </div>
        <button className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5 hover:bg-amber-500/20 transition-all">
          <Lock className="w-3 h-3 text-amber-400" />
          <span className="text-amber-400 text-xs font-medium">相簿</span>
        </button>
      </div>

      {/* Vanish mode banner */}
      {vanishMode && (
        <div className="flex-shrink-0 bg-violet-900/30 border-b border-violet-500/20 px-4 py-2 flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          <span className="text-violet-400 text-xs font-medium">閱後即焚模式開啟 — 訊息查看後將自動消失</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.filter(m => !m.removed).map(msg => {
          const isMe = msg.senderId === 'me';
          // ✅ 總監新增：判斷內容是否為圖片 Base64
          const isImage = msg.content.startsWith('data:image');
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%] space-y-1">
                <div
                  onClick={() => msg.isVanish && !msg.revealed ? revealMessage(msg.id) : undefined}
                  className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all duration-300 ${
                    isMe
                      ? 'bg-gradient-to-br from-violet-600 to-blue-600 text-white rounded-br-sm'
                      : 'bg-white/8 border border-white/10 text-white/85 rounded-bl-sm'
                  } ${msg.isVanish && !msg.revealed ? 'cursor-pointer select-none' : ''} ${
                    isImage ? 'p-1.5' : '' // 如果是圖片，減少 padding 讓圖片更貼合邊緣
                  }`}
                >
                  {msg.isVanish && !msg.revealed ? (
                    <div className="flex items-center gap-2 px-2 py-1">
                      <span className="blur-sm select-none text-white/70">
                        {isImage ? '[傳送了一張圖片]' : msg.content}
                      </span>
                      <span className="text-xs text-white/50 flex-shrink-0 not-italic">👁 輕觸</span>
                    </div>
                  ) : (
                    // ✅ 總監新增：渲染圖片或純文字
                    isImage ? (
                      <img src={msg.content} alt="Uploaded" className="w-full max-w-[200px] rounded-xl object-cover" />
                    ) : (
                      msg.content
                    )
                  )}
                  {msg.isVanish && msg.revealed && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center z-10">
                      <Timer className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <p className={`text-[10px] text-white/25 ${isMe ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.timestamp)}
                  {msg.isVanish && <span className="ml-1 text-violet-400/60">· 閱後即焚</span>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/8 px-3 py-3 safe-area-bottom">
        <div className="flex items-center gap-2">
          
          {/* ✅ 總監新增：隱藏的 File Input */}
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />
          
          {/* ✅ 改用 onClick 觸發隱藏的 fileInputRef */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-all"
          >
            <ImageIcon className="w-4 h-4 text-white/40" />
          </button>
          
          <button
            onClick={() => setVanishMode(!vanishMode)}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              vanishMode
                ? 'bg-violet-600/30 border border-violet-500/60 shadow-lg shadow-violet-500/20'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
            title="切換閱後即焚模式"
          >
            <Timer className={`w-4 h-4 ${vanishMode ? 'text-violet-400' : 'text-white/40'}`} />
          </button>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-full flex items-center px-4 focus-within:border-violet-500/50 transition-all">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={vanishMode ? '💬 閱後即焚模式...' : '輸入訊息...'}
              className="flex-1 bg-transparent text-white placeholder-white/30 text-sm py-2.5 outline-none"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 disabled:from-slate-700 disabled:to-slate-700 flex items-center justify-center flex-shrink-0 transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}