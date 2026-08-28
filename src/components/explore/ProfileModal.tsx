import React, { useState } from 'react';
import { createPortal } from 'react-dom'; // ✅ 總監導入：React 傳送門，突破所有點擊限制！
import { X, Heart, MessageCircle, Lock, BadgeCheck, Crown, ShieldOff, MapPin, Ruler, Users, Search, Rocket } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabaseClient';

interface Props {
  user: any; 
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const { blockUser } = useApp();
  const { user: currentUser } = useAuth();
  
  const [liked, setLiked] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showPrivateAlbum, setShowPrivateAlbum] = useState(false);

  function handleBlock() {
    blockUser(user.id);
    onClose();
  }

  // ✅ 心動邏輯 (加入 Alert 防呆)
  async function handleLike() {
    if (liked) return;
    try {
      const { data: success, error } = await supabase.rpc('send_like_with_cooldown', { target_id: user.id });
      if (error) throw error;
      
      if (!success) {
        alert('⏳ 24小時內只能對同一個人發送一次心動喔！');
        return;
      }
      setLiked(true);
    } catch (error: any) {
      console.error("🔴 發送心動失敗:", error);
      alert(`心動發送失敗：${error.message}\n(請確認是否有在 Supabase 執行上一篇的 SQL 排程腳本！)`);
    }
  }

  // ✅ 推送邏輯 (加入 Alert 防呆)
  async function handleBoost() {
    if (isBoosting) return;
    setIsBoosting(true);
    try {
      const { error } = await supabase.rpc('boost_user_profile', { target_id: user.id });
      if (error) throw error;
      alert(`🚀 成功推送 ${user.full_name}！他的本日排名已上升！`);
    } catch (error: any) {
      console.error("🔴 推送失敗:", error);
      alert(`推送失敗：${error.message}\n(請確認是否有在 Supabase 執行上一篇的 SQL 排程腳本！)`);
    } finally {
      setIsBoosting(false);
    }
  }

  async function handleRequestAlbum() {
    if (showPrivateAlbum) return;
    setShowPrivateAlbum(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        receiver_id: user.id,
        sender_id: currentUser?.id,
        type: 'album_request'
      });
      if (error) throw error;
      alert('已送出私密相簿查看申請！');
    } catch (error: any) {
      console.error("申請相簿失敗:", error);
      alert(`申請失敗：${error.message}`);
      setShowPrivateAlbum(false);
    }
  }

  function handleMessage() {
    window.dispatchEvent(new CustomEvent('jump-to-chat', { detail: user }));
    onClose();
  }

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : '??';
  const getGradient = (id: string = '') => {
    const gradients = ['from-blue-600 to-violet-600', 'from-orange-500 to-red-600', 'from-emerald-500 to-teal-700', 'from-pink-500 to-rose-600'];
    return gradients[(id.charCodeAt(0) || 0) % gradients.length];
  };

  // ✅ 將原本的 UI 包裝進變數
  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-end justify-center">
      
      <div className="w-full max-w-md bg-[#0B0C10] rounded-t-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards', maxHeight: '90vh' }}>
        
        <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden pb-4" style={{ scrollbarWidth: 'none' }}>
          <div className="relative">
            {user.avatar_url ? (
              <div className="h-64 relative">
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent" />
              </div>
            ) : (
              <div className={`h-64 bg-gradient-to-br ${getGradient(user.id)} flex items-center justify-center relative`}>
                <span className="text-white font-black text-6xl drop-shadow-xl opacity-80 mix-blend-overlay">
                  {getInitials(user.full_name)}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent" />
              </div>
            )}

            <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
              <button onClick={onClose} className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-all">
                <X className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setShowBlockConfirm(true)} className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-red-500/30 rounded-full px-3 py-1.5 hover:bg-red-950/60 transition-all">
                <ShieldOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 text-xs font-medium">封鎖</span>
              </button>
            </div>
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-violet-400" />
              <span className="text-white/80 text-xs font-medium">{user.distance || '< 100m'}</span>
            </div>
          </div>
          
          <div className="px-5 pt-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white text-xl font-bold">{user.full_name}</h2>
                  <span className="text-white/40">,</span>
                  <span className="text-white/60 text-lg">{user.age || '25'}</span>
                  {user.isVerified && <BadgeCheck className="w-5 h-5 text-cyan-400" />}
                  {user.isVIP && <Crown className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/8 text-white/40'}`}>
                    {user.status === 'online' ? '● 上線中' : '近期上線'}
                  </span>
                  <span className="text-white/30 text-xs capitalize">{user.tribe || '未分類'}</span>
                </div>
              </div>
            </div>

            <p className="text-white/65 text-sm leading-relaxed">{user.bio || '這個人很神祕，還沒有寫下任何介紹。'}</p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Ruler, label: '身高', val: user.height || '未填寫' },
                { icon: Users, label: '角色', val: user.role || '探索中' },
                { icon: Search, label: '尋找', val: user.looking_for || '聊天' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                    <Icon className="w-4 h-4 text-white/30 mx-auto mb-1" />
                    <p className="text-white/80 text-xs font-semibold">{s.val}</p>
                    <p className="text-white/30 text-[10px]">{s.label}</p>
                  </div>
                );
              })}
            </div>

            <div onClick={handleRequestAlbum} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/8 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-sm font-semibold">私密相簿</p>
                <p className="text-white/40 text-xs">8 張照片 · 申請查看</p>
              </div>
              {showPrivateAlbum && <span className="text-amber-400 text-xs">已申請 ✓</span>}
            </div>
          </div>
        </div>

        <div className="p-4 pb-8 bg-[#0B0C10]/95 backdrop-blur-xl border-t border-white/10 shrink-0 relative z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <div className="flex gap-2">
            <button onClick={handleLike} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl font-semibold text-xs transition-all ${liked ? 'bg-pink-500/20 border border-pink-500/40 text-pink-400' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white/80'}`}>
              <Heart className={`w-5 h-5 ${liked ? 'fill-pink-400' : ''}`} />
              {liked ? '已發送' : '心動'}
            </button>
            <button onClick={handleBoost} disabled={isBoosting} className="flex-[1.2] flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-orange-500/20 border border-amber-300/30">
              <Rocket className={`w-5 h-5 ${isBoosting ? 'animate-bounce' : ''}`} />
              推送排名
            </button>
            <button onClick={handleMessage} className="flex-1 flex flex-col items-center justify-center gap-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 py-3 rounded-xl font-semibold text-xs transition-all">
              <MessageCircle className="w-5 h-5" />
              Message
            </button>
          </div>
        </div>

        {showBlockConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-[70]">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-xs text-center">
              <ShieldOff className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">封鎖 {user.full_name}？</h3>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowBlockConfirm(false)} className="flex-1 bg-white/8 border border-white/10 text-white/70 py-2.5 rounded-xl text-sm font-medium">取消</button>
                <button onClick={handleBlock} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold">封鎖</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ✅ 使用 React 傳送門，強制將畫面掛載到 body 最頂層
  return createPortal(modalContent, document.body);
}