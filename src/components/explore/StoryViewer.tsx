import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface StoryUser {
  id: string;
  full_name?: string;
  avatar_url?: string;
  status?: string;
}

interface Props {
  user: StoryUser;
  onClose: () => void;
}

const STORY_SLIDES = [
  { bg: 'from-slate-800 to-slate-900', text: '🚧 限時動態功能即將推出' },
];

export default function StoryViewer({ user, onClose }: Props) {
  const DURATION = 3000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, DURATION);
    return () => clearTimeout(timer);
  }, [onClose, DURATION]);

  const slide = STORY_SLIDES[0];

  const getInitials = (name?: string) => name ? name.substring(0, 2).toUpperCase() : '??';
  const getGradient = (id: string = '') => {
    const gradients = ['from-blue-600 to-violet-600', 'from-orange-500 to-red-600', 'from-emerald-500 to-teal-700', 'from-pink-500 to-rose-600'];
    const charCode = id ? id.charCodeAt(0) : 0;
    return gradients[charCode % gradients.length];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col max-w-md mx-auto">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/25 overflow-hidden">
        <div
          className="h-full bg-white transition-none rounded-full"
          style={{
            width: '100%',
            animation: `storyProgress ${DURATION}ms linear forwards`,
          }}
        />
      </div>

      <div className="absolute top-8 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white/30 overflow-hidden bg-slate-800">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getGradient(user.id)} flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">{getInitials(user.full_name)}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm drop-shadow-md">{user.full_name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className={`flex-1 bg-gradient-to-br ${slide.bg} flex items-center justify-center`}>
        <p className="text-white text-2xl font-bold drop-shadow-lg px-8 text-center">{slide.text}</p>
      </div>
    </div>
  );
}