import React from 'react';
import { TribeType } from '@/types';

interface Props {
  active: TribeType;
  onChange: (t: TribeType) => void;
}

// 建立族群資料陣列 (對應您的截圖)
const TRIBES = [
  { id: 'all', label: '全部', icon: '' },
  { id: 'bear', label: '熊族', icon: '🐻' },
  { id: 'wolf', label: '狼族', icon: '🐺' },
  { id: 'otter', label: '水獺', icon: '🦦' },
  { id: 'youth', label: '少年', icon: '✨' },
  { id: 'gym', label: '巨巨', icon: '💪' }, // 假設被切掉的是巨巨，您可自行修改
];

export default function TribeFilters({ active, onChange }: Props) {
  return (
    <div className="px-3 pb-3">
      {/* ✅ 總監修復：加入 overflow-x-auto, no-scrollbar 以及隱藏 Webkit 捲軸 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        
        {TRIBES.map(tribe => {
          const isActive = active === tribe.id;
          return (
            <button
              key={tribe.id}
              onClick={() => onChange(tribe.id as TribeType)}
              // ✅ 總監修復：加入 flex-shrink-0 防止被擠壓
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full flex-shrink-0 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white border-2 border-amber-400 shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90'
              }`}
            >
              {tribe.icon && <span>{tribe.icon}</span>}
              <span className="text-sm font-bold">{tribe.label}</span>
            </button>
          );
        })}
        
      </div>
    </div>
  );
}