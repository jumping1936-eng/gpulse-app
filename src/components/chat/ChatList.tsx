import React from 'react';
import { MessageCircle, Crown, BadgeCheck } from 'lucide-react';
import { Conversation } from '@/types';
import { MOCK_CONVERSATIONS } from '@/data/mockData';

interface Props {
  onOpenConvo: (c: Conversation) => void;
}

export default function ChatList({ onOpenConvo }: Props) {
  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/8 px-4 py-4 z-10">
        <h1 className="text-white font-bold text-xl">訊息</h1>
      </div>

      <div className="divide-y divide-white/5">
        {MOCK_CONVERSATIONS.map(convo => (
          <div
            key={convo.id}
            onClick={() => onOpenConvo(convo)}
            className="flex items-center gap-4 px-4 py-4 hover:bg-white/4 active:bg-white/6 transition-colors cursor-pointer"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${convo.user.gradientFrom} ${convo.user.gradientTo} flex items-center justify-center`}>
                <span className="text-white font-bold">{convo.user.initials}</span>
              </div>
              {convo.user.lastSeen === 'Online' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold text-sm ${convo.unread > 0 ? 'text-white' : 'text-white/70'}`}>
                    {convo.user.name}
                  </span>
                  {convo.user.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />}
                  {convo.user.isVIP && <Crown className="w-3 h-3 text-amber-400" />}
                </div>
                <span className="text-white/30 text-xs flex-shrink-0">{convo.lastTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-xs truncate ${convo.unread > 0 ? 'text-white/60' : 'text-white/35'}`}>
                  {convo.lastMessage}
                </p>
                {convo.unread > 0 && (
                  <span className="ml-2 w-5 h-5 bg-violet-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {convo.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {MOCK_CONVERSATIONS.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-24 gap-4">
          <MessageCircle className="w-16 h-16 text-white/10" />
          <p className="text-white/30 text-sm">尚無訊息</p>
        </div>
      )}
    </div>
  );
}
