import React, { useState } from 'react';
import { Crown, BadgeCheck, Camera } from 'lucide-react';
import { User, TribeType } from '@/types';
import { MOCK_USERS } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import ProfileModal from './ProfileModal';

interface Props {
  activeTribe: TribeType;
}

export default function ExploreGrid({ activeTribe }: Props) {
  const { blockedUsers, myAvatar, isVerified, isVIP } = useApp();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filtered = MOCK_USERS.filter(u => {
    if (blockedUsers.has(u.id)) return false;
    if (activeTribe === 'all') return true;
    if (activeTribe === 'chat') return u.lookingFor === 'Chat';
    if (activeTribe === 'relationship') return u.lookingFor === 'Relationship';
    return u.tribe === activeTribe;
  });

  return (
    <div className="px-2 pb-6">
      <div className="grid grid-cols-3 gap-1.5">
        {/* Self card — always first */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-800 border-2 border-violet-500/40 shadow-lg shadow-violet-500/10 cursor-pointer group">
          {myAvatar ? (
            <img src={myAvatar} alt="Me" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-700/50 to-blue-700/30 flex flex-col items-center justify-center gap-1">
              <Camera className="w-6 h-6 text-violet-400/60" />
              <span className="text-violet-400/60 text-xs">新增照片</span>
            </div>
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <div className="flex items-center gap-1">
              <span className="text-white text-xs font-bold">你</span>
              {isVerified && <BadgeCheck className="w-3 h-3 text-cyan-400" />}
              {isVIP && <Crown className="w-3 h-3 text-amber-400" />}
            </div>
          </div>
          <div className="absolute top-2 left-2 bg-violet-500/30 backdrop-blur-sm border border-violet-500/30 rounded-full px-2 py-0.5">
            <span className="text-violet-300 text-[9px] font-bold">你自己</span>
          </div>
        </div>

        {/* User cards */}
        {filtered.map(user => (
          <div
            key={user.id}
            onClick={() => setSelectedUser(user)}
            className="relative aspect-square rounded-xl overflow-hidden bg-slate-800 cursor-pointer group hover:scale-[1.02] transition-transform duration-200"
          >
            {/* Avatar */}
            <div className={`w-full h-full bg-gradient-to-br ${user.gradientFrom} ${user.gradientTo} flex items-center justify-center`}>
              <span className="text-white font-bold text-3xl">{user.initials}</span>
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            {/* Info */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5">
              <div className="flex items-center gap-1">
                <span className="text-white text-xs font-semibold truncate">{user.name}</span>
                {user.isVerified && <BadgeCheck className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
                {user.isVIP && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
              </div>
              <p className="text-white/50 text-[9px]">{user.distance}</p>
            </div>
            {/* Online indicator */}
            {user.lastSeen === 'Online' && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-800 shadow-sm" />
            )}
          </div>
        ))}
      </div>

      {selectedUser && (
        <ProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
