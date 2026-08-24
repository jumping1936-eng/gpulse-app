import React from 'react';
import { Home, Compass, MessageCircle, Bell, User } from 'lucide-react';

// 定義 Props 型別，允許外部傳入目前的 Tab 以及未讀通知數量
interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
}

export default function BottomNav({ activeTab, onTabChange, unreadCount = 3 }: BottomNavProps) {
  // 定義導覽列的按鈕設定檔
  const navItems = [
    { id: 'home', icon: Home, label: '首頁' },
    { id: 'explore', icon: Compass, label: '探索' },
    { id: 'messages', icon: MessageCircle, label: '訊息' },
    { id: 'notifications', icon: Bell, label: '通知', showBadge: true },
    { id: 'profile', icon: User, label: '我的' },
  ];

  return (
    <div className="absolute bottom-0 w-full bg-[#0B0C10]/90 backdrop-blur-xl border-t border-white/10 px-6 py-4 pb-safe z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center gap-1 p-2 group transition-transform active:scale-90"
            >
              <div className="relative">
                <Icon 
                  className={`w-6 h-6 transition-all duration-300 ${
                    isActive 
                      ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' 
                      : 'text-slate-500 group-hover:text-slate-400'
                  }`} 
                  fill={isActive ? 'currentColor' : 'none'}
                />
                
                {/* 通知紅點 (Badge) 邏輯 */}
                {item.showBadge && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 items-center justify-center border-2 border-[#0B0C10]">
                      <span className="text-[9px] font-black text-white leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-indigo-400' : 'text-transparent'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

      </div>
    </div>
  );
}