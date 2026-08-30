import React, { useState } from 'react';
import { Crown, BadgeCheck, Camera } from 'lucide-react';
import { TribeType } from '@/types';
import { useApp } from '@/context/AppContext';
import ProfileModal from './ProfileModal';

// ✅ 1. 擴充 Props，接收來自上層 (ExploreTab) 的真實資料庫資料
interface ProfileRow {
  id: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  isVerified?: boolean;
  isVIP?: boolean;
  status?: string;
  looking_for?: string;
  tribe?: TribeType;
}

interface Props {
  activeTribe: TribeType;
  profiles: ProfileRow[];
  myProfile: ProfileRow | null;
  onViewProfile?: (profile: ProfileRow | null) => void;
}

export default function ExploreGrid({ activeTribe, profiles, myProfile, onViewProfile }: Props) {
  const { blockedUsers, isVerified, isVIP } = useApp();
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);

  // ✅ 2. 基於真實資料庫欄位進行過濾
  const filtered = profiles.filter(u => {
    if (blockedUsers.has(u.id)) return false;
    if (activeTribe === 'all') return true;
    
    // ⚠️ 防呆提醒：請確保您的 Supabase profiles 表格有對應的 looking_for 或 tribe 欄位
    // 若目前資料庫尚無這些欄位，過濾器將暫時返回 false 或需後續擴充 Schema
    if (activeTribe === 'chat') return u.looking_for === 'Chat';
    if (activeTribe === 'relationship') return u.looking_for === 'Relationship';
    return u.tribe === activeTribe;
  });

  // ✅ 3. 動態運算缺乏頭像時的替代視覺
  const getGradient = (index: number) => {
    const gradients = [
      'from-blue-600 to-violet-600',
      'from-orange-500 to-red-600',
      'from-emerald-500 to-teal-700',
      'from-pink-500 to-rose-600'
    ];
    return gradients[index % gradients.length];
  };

  const getInitials = (name?: string) => {
    return name ? name.substring(0, 2).toUpperCase() : '??';
  };

  return (
    <div className="px-2 pb-6">
      <div className="grid grid-cols-3 gap-1.5">
        
        {/* ========================================== */}
        {/* 自己的名片 (永遠固定在第一格，讀取真實 myProfile) */}
        {/* ========================================== */}
        <button
          type="button"
          onClick={() => onViewProfile?.(myProfile ?? null)}
          className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border-2 border-violet-500/50 shadow-lg shadow-violet-500/15 backdrop-blur-sm cursor-pointer group hover:shadow-violet-500/25 transition-all hover:scale-[1.02]"
        >
          {myProfile?.avatar_url ? (
            <img src={myProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-700/50 to-blue-700/30 flex flex-col items-center justify-center gap-1">
              <Camera className="w-6 h-6 text-violet-400/60" />
              <span className="text-violet-400/60 text-xs">新增照片</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <div className="flex items-center gap-1">
              <span className="text-white text-xs font-bold truncate">
                {myProfile?.full_name || '你'}
              </span>
              {isVerified && <BadgeCheck className="w-3 h-3 text-cyan-400" />}
              {isVIP && <Crown className="w-3 h-3 text-amber-500" />}
            </div>
          </div>
          <div className="absolute top-2 left-2 bg-violet-600/40 backdrop-blur-xl border border-violet-500/40 rounded-full px-2 py-0.5">
            <span className="text-violet-300 text-[9px] font-bold">你自己</span>
          </div>
        </button>

        {/* ========================================== */}
        {/* 其他使用者的名片 (讀取真實 profiles) */}
        {/* ========================================== */}
        {filtered.map((user, index) => (
          <div
            key={user.id}
            onClick={() => setSelectedUser(user)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-white/10 backdrop-blur-sm cursor-pointer group hover:scale-[1.05] hover:border-violet-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20"
          >
            {/* 頭像或漸層替代方案 */}
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getGradient(index)} flex items-center justify-center`}>
                <span className="text-white font-bold text-3xl opacity-80 mix-blend-overlay">
                  {getInitials(user.full_name)}
                </span>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* 使用者資訊 */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5">
              <div className="flex items-center gap-1">
                {/* 注意：真實資料庫使用的是 full_name */}
                <span className="text-white text-xs font-semibold truncate">{user.full_name}</span>
                {user.isVerified && <BadgeCheck className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
                {user.isVIP && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
              </div>
              {/* 若資料庫尚無 distance，預設顯示一段文字或空值 */}
              <p className="text-white/50 text-[9px]">{user.bio ? user.bio.substring(0, 10) + '...' : '< 100m'}</p>
            </div>
            
            {/* 真實的上線狀態指示器 (假設未來實作了 presence 功能) */}
            {user.status === 'online' && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 shadow-lg shadow-emerald-400/20" />
            )}
          </div>
        ))}
      </div>

      {/* ⚠️ 總監防呆提醒：點擊彈出的 ProfileModal 內部程式碼，也必須從 user.name 調整為 user.full_name 才能正確顯示！ */}
      {selectedUser && (
        <ProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}