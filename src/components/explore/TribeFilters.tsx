import React from 'react';
import { TribeType } from '@/types';

interface Props {
  active: TribeType;
  onChange: (t: TribeType) => void;
}

// ✅ 靜態配置：定義族群篩選器資料 (放置於元件外部，優化記憶體效能)
const TRIBES = [
  { id: 'all', label: '全部', icon: '' },
  { id: 'bear', label: '熊族', icon: '🐻' },
  { id: 'wolf', label: '狼族', icon: '🐺' },
  { id: 'otter', label: '水獺', icon: '🦦' },
  { id: 'youth', label: '少年', icon: '✨' },
  { id: 'gym', label: '巨巨', icon: '💪' },
] as const; // 使用 as const 鎖定結構，提升 TS 嚴謹度

export default function TribeFilters({ active, onChange }: Props) {
  return (
    <div className="px-3 pb-3">
      {/* 水平滑動容器：隱藏滾動條但保持可滑動 */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" 
        style={{ scrollbarWidth: 'none' }}
      >
        {TRIBES.map(tribe => {
          const isActive = active === tribe.id;
          
          return (
            <button
              key={tribe.id}
              onClick={() => onChange(tribe.id as TribeType)}
              // flex-shrink-0 確保按鈕在空間不足時不會被擠壓變形
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