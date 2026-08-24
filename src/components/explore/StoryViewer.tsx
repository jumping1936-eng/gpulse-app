import React, { useEffect, useState } from 'react';
import { X, Heart, MessageCircle } from 'lucide-react';
import { User } from '@/types';

interface Props {
  user: User;
  onClose: () => void;
}

const STORY_SLIDES = [
  { bg: 'from-violet-800 to-blue-900', text: '📍 今晚在市中心 🌆' },
  { bg: 'from-rose-800 to-pink-900', text: '✨ 只要好氛圍' },
  { bg: 'from-teal-800 to-cyan-900', text: '🏋️ 健身後的樣子' },
];

export default function StoryViewer({ user, onClose }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const totalSlides = STORY_SLIDES.length;
  const DURATION = 3000;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const slideProgress = (elapsed % DURATION) / DURATION;
      setProgress(slideProgress * 100);

      const newSlide = Math.floor(elapsed / DURATION);
      if (newSlide >= totalSlides) {
        onClose();
        clearInterval(interval);
      } else {
        setCurrentSlide(newSlide);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const slide = STORY_SLIDES[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col max-w-md mx-auto">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1.5 p-3 z-10">
        {STORY_SLIDES.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-white transition-none rounded-full"
              style={{
                width: i < currentSlide ? '100%' : i === currentSlide ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${user.gradientFrom} ${user.gradientTo} flex items-center justify-center ring-2 ring-white/30`}>
            <span className="text-white font-bold text-sm">{user.initials}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm drop-shadow-md">{user.name}</p>
            <p className="text-white/60 text-xs">{user.lastSeen}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Story content */}
      <div className={`flex-1 bg-gradient-to-br ${slide.bg} flex items-center justify-center`}>
        <p className="text-white text-2xl font-bold drop-shadow-lg px-8 text-center">{slide.text}</p>
      </div>

      {/* Bottom actions */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between px-5 z-10">
        <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/15 rounded-full px-4 py-2.5">
          <p className="text-white/50 text-sm">回覆 {user.name}...</p>
        </div>
        <div className="flex items-center gap-3 ml-3">
          <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/20 transition-all">
            <Heart className="w-5 h-5 text-white" />
          </button>
          <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white/20 transition-all">
            <MessageCircle className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
