import React from 'react';
import { Crown, X, Zap, Globe, EyeOff, Rewind, Star } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const PERKS = [
  { icon: Globe, label: '旅行模式', desc: '探索全球任何城市的使用者' },
  { icon: EyeOff, label: '隱身模式', desc: '隱藏瀏覽—只有你按讚的人能看見你' },
  { icon: Rewind, label: '反悔跳過', desc: '收回不小心滑掉的使用者' },
  { icon: Star, label: '檔案推廣', desc: '每週獲得 10 倍檔案瀏覽量' },
  { icon: Zap, label: '優先配對', desc: '跳到所有人動態的頂端' },
];

export default function PaywallModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>

        {/* Gold header */}
        <div className="bg-gradient-to-r from-amber-600/20 via-yellow-500/10 to-amber-600/20 border-b border-amber-500/20 px-6 pt-6 pb-5 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">GPulse VIP</h2>
              <p className="text-amber-400/70 text-xs">解鎖高級功能</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Perks */}
          <div className="space-y-3 mb-6">
            {PERKS.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">{p.label}</p>
                    <p className="text-white/40 text-xs">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { duration: '1 個月', price: '$9.99', per: '/月', highlight: false },
              { duration: '3 個月', price: '$7.99', per: '/月', highlight: true, badge: '熱門' },
              { duration: '12 個月', price: '$4.99', per: '/月', highlight: false, badge: '最划算' },
            ].map(plan => (
              <div key={plan.duration} className={`relative rounded-xl border p-3 text-center cursor-pointer transition-all ${plan.highlight ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/10 bg-white/3 hover:border-white/20'}`}>
                {plan.badge && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}
                <p className="text-white/50 text-[10px] mb-1">{plan.duration}</p>
                <p className={`font-bold text-base ${plan.highlight ? 'text-amber-400' : 'text-white'}`}>{plan.price}</p>
                <p className="text-white/30 text-[10px]">{plan.per}</p>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/30 text-sm"
          >
            立即升級 VIP
          </button>
          <p className="text-white/20 text-[10px] text-center mt-2">隨時取消 · 每月計費 · 自動續約</p>
        </div>
      </div>
    </div>
  );
}
