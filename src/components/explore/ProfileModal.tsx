import React, { useState } from 'react';
import { X, Heart, MessageCircle, Lock, BadgeCheck, Crown, ShieldOff, MapPin, Ruler, Users, Search } from 'lucide-react';
import { User } from '@/types';
import { useApp } from '@/context/AppContext';

interface Props {
  user: User;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const { blockUser } = useApp();
  const [liked, setLiked] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showPrivateAlbum, setShowPrivateAlbum] = useState(false);

  function handleBlock() {
    blockUser(user.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end justify-center">
      <div className="w-full max-w-md bg-slate-900 rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards', maxHeight: '90vh' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>

        <div className="overflow-y-auto max-h-[90vh]">
          {/* Hero */}
          <div className="relative">
            <div className={`h-64 bg-gradient-to-br ${user.gradientFrom} ${user.gradientTo} flex items-center justify-center`}>
              <span className="text-white font-black text-6xl drop-shadow-xl">{user.initials}</span>
            </div>

            {/* Actions row on image */}
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <button onClick={onClose} className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-all">
                <X className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setShowBlockConfirm(true)}
                className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-red-500/30 rounded-full px-3 py-1.5 hover:bg-red-950/60 transition-all"
              >
                <ShieldOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 text-xs font-medium">封鎖</span>
              </button>
            </div>

            {/* Distance badge */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-violet-400" />
              <span className="text-white/80 text-xs font-medium">{user.distance}</span>
            </div>
          </div>

          {/* Info */}
          <div className="px-5 pt-4 pb-6 space-y-4">
            {/* Name & badges */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white text-xl font-bold">{user.name}</h2>
                  <span className="text-white/40">,</span>
                  <span className="text-white/60 text-lg">{user.age}</span>
                  {user.isVerified && <BadgeCheck className="w-5 h-5 text-cyan-400" />}
                  {user.isVIP && <Crown className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.lastSeen === 'Online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/8 text-white/40'}`}>
                    {user.lastSeen === 'Online' ? '● 上線中' : user.lastSeen}
                  </span>
                  <span className="text-white/30 text-xs capitalize">{user.tribe}</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-white/65 text-sm leading-relaxed">{user.bio}</p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Ruler, label: '身高', val: user.height },
                { icon: Users, label: '角色', val: user.role },
                { icon: Search, label: '尋找', val: user.lookingFor },
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

            {/* Private album */}
            <div
              onClick={() => setShowPrivateAlbum(!showPrivateAlbum)}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/8 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-sm font-semibold">私密相簿</p>
                <p className="text-white/40 text-xs">8 張照片 · 申請查看</p>
              </div>
              {showPrivateAlbum && (
                <span className="text-amber-400 text-xs">已申請 ✓</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setLiked(!liked)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  liked
                    ? 'bg-pink-500/20 border border-pink-500/40 text-pink-400'
                    : 'bg-gradient-to-r from-pink-600/80 to-rose-600/80 hover:from-pink-500 hover:to-rose-500 text-white shadow-lg shadow-pink-500/20'
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-pink-400' : ''}`} />
                {liked ? '已按讚！' : '心動'}
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-white/8 border border-white/10 hover:bg-white/12 text-white/80 py-3.5 rounded-xl font-semibold text-sm transition-all">
                <MessageCircle className="w-5 h-5" />
                Message
              </button>
            </div>
          </div>
        </div>

        {/* Block confirm overlay */}
        {showBlockConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-xs text-center">
              <ShieldOff className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">封鎖 {user.name}？</h3>
              <p className="text-white/50 text-sm mb-5">他們將無法看見你或聯繫你。</p>
              <div className="flex gap-3">
                <button onClick={() => setShowBlockConfirm(false)} className="flex-1 bg-white/8 border border-white/10 text-white/70 py-2.5 rounded-xl text-sm font-medium">取消</button>
                <button onClick={handleBlock} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold">封鎖</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
