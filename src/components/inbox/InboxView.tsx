import React, { useState } from 'react';
import { Heart, UserCheck, Bell, Mail, Crown, BadgeCheck } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/data/mockData';
import { Notification } from '@/types';

export default function InboxView() {
  const [activeTab, setActiveTab] = useState<'interactions' | 'system'>('interactions');
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const interactions = notifications.filter(n => n.type !== 'system');
  const system = notifications.filter(n => n.type === 'system');
  const unreadInteractions = interactions.filter(n => !n.read).length;
  const unreadSystem = system.filter(n => !n.read).length;

  function NotifIcon({ type }: { type: Notification['type'] }) {
    if (type === 'like') return <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />;
    if (type === 'match') return <Crown className="w-4 h-4 text-amber-400" />;
    if (type === 'visit') return <UserCheck className="w-4 h-4 text-cyan-400" />;
    return <Bell className="w-4 h-4 text-violet-400" />;
  }

  function NotifBg({ type }: { type: Notification['type'] }) {
    if (type === 'like') return 'bg-pink-500/10';
    if (type === 'match') return 'bg-amber-500/10';
    if (type === 'visit') return 'bg-cyan-500/10';
    return 'bg-violet-500/10';
  }

  const currentList = activeTab === 'interactions' ? interactions : system;

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/8 px-4 py-4 z-10">
        <h1 className="text-white font-bold text-xl mb-3">通知</h1>
        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'interactions', label: '互動', badge: unreadInteractions, icon: Heart },
            { id: 'system', label: '系統', badge: unreadSystem, icon: Mail },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {currentList.map(notif => (
          <div
            key={notif.id}
            onClick={() => markRead(notif.id)}
            className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-colors hover:bg-white/4 ${!notif.read ? 'bg-white/3' : ''}`}
          >
            {notif.user ? (
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${notif.user.gradientFrom} ${notif.user.gradientTo} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-sm">{notif.user.initials}</span>
              </div>
            ) : (
              <div className={`w-11 h-11 rounded-full ${NotifBg({ type: notif.type })} border border-white/10 flex items-center justify-center flex-shrink-0`}>
                <NotifIcon type={notif.type} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                {notif.user && (
                  <>
                    <span className={`text-sm font-semibold ${!notif.read ? 'text-white' : 'text-white/70'}`}>{notif.user.name}</span>
                    {notif.user.isVerified && <BadgeCheck className="w-3 h-3 text-cyan-400" />}
                  </>
                )}
              </div>
              <p className={`text-xs ${!notif.read ? 'text-white/60' : 'text-white/35'}`}>
                {notif.content}
              </p>
              <p className="text-white/25 text-[10px] mt-0.5">{notif.time}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full ${NotifBg({ type: notif.type })} flex items-center justify-center`}>
                <NotifIcon type={notif.type} />
              </div>
              {!notif.read && <div className="w-2 h-2 rounded-full bg-violet-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
