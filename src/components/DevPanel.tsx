import React from 'react';
import { Bug, ShieldAlert, Crown, EyeOff, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface Props {
  onSimulateBlockedCountry: () => void;
}

export default function DevPanel({ onSimulateBlockedCountry }: Props) {
  const { isVIP, setIsVIP, setShowPaywall, setStealthMode, setTravelMode } = useApp();

  return (
    <div className="px-4 mt-4 mb-8">
      <div className="bg-red-950/20 border border-red-900/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-red-900/30 bg-red-950/30">
          <Bug className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-xs font-mono font-bold">開發者面板</span>
          <span className="ml-auto text-red-800/60 text-[10px]">v2.0 · 僅限開發</span>
        </div>

        <div className="p-4 space-y-2.5">
          {/* Simulate VIP expiry */}
          <button
            onClick={() => setShowPaywall(true)}
            className="w-full flex items-center gap-3 bg-amber-950/30 border border-amber-900/40 rounded-xl px-4 py-3 hover:border-amber-700/50 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <p className="text-amber-300/80 text-xs font-semibold">模擬 VIP 到期</p>
              <p className="text-amber-900/70 text-[10px]">觸發付費牆彈窗</p>
            </div>
          </button>

          {/* Simulate blocked country */}
          <button
            onClick={onSimulateBlockedCountry}
            className="w-full flex items-center gap-3 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3 hover:border-red-700/50 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div>
              <p className="text-red-300/80 text-xs font-semibold">模擬不友善國家</p>
              <p className="text-red-900/70 text-[10px]">顯示地理封鎖安全畫面</p>
            </div>
          </button>

          {/* Toggle VIP */}
          <button
            onClick={() => setIsVIP(!isVIP)}
            className="w-full flex items-center gap-3 bg-violet-950/30 border border-violet-900/40 rounded-xl px-4 py-3 hover:border-violet-700/50 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-violet-300/80 text-xs font-semibold">切換 VIP 狀態</p>
              <p className="text-violet-900/70 text-[10px]">目前：{isVIP ? 'VIP ✓' : '非 VIP'}</p>
            </div>
          </button>

          {/* Reset VIP features */}
          <button
            onClick={() => { setStealthMode(false); setTravelMode(false); }}
            className="w-full flex items-center gap-3 bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3 hover:border-slate-600/50 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-700/30 flex items-center justify-center">
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-300/60 text-xs font-semibold">重置 VIP 功能</p>
              <p className="text-slate-600 text-[10px]">清除隱身與旅行模式</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
