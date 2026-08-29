import React from 'react';
import { Crown, X, Zap, Globe, EyeOff, Rewind, Star, Lock, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
}

// ✅ 更新：添加私密相簿特权
const PERKS = [
  { icon: Lock, label: '無限私密相簿', desc: '上傳無上限的私密相片' },
  { icon: EyeOff, label: '隱身模式', desc: '隱藏瀏覽—只有你按讚的人能看見你' },
  { icon: Zap, label: '無限滑卡', desc: '解除每日滑卡次數限制' },
  { icon: Globe, label: '旅行模式', desc: '探索全球任何城市的使用者' },
  { icon: Rewind, label: '反悔跳過', desc: '收回不小心滑掉的使用者' },
  { icon: Star, label: '檔案推廣', desc: '每週獲得 10 倍檔案瀏覽量' },
];

export default function PaywallModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-slate-950/90 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/20 animate-in zoom-in-95 duration-300"
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>

        {/* ✅ 更新：Amber 主题头部 */}
        <div className="bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-600/30 border-b border-amber-500/40 px-6 pt-6 pb-5 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors hover:bg-white/10 rounded-lg p-1">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/40">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">GPulse VIP</h2>
              <p className="text-amber-300 text-xs font-medium">解鎖頂級功能</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {/* ✅ 更新：Perks 列表 - 6 项特权 */}
          <div className="space-y-2.5 mb-7">
            {PERKS.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:border-amber-500/30 transition-all">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/95 text-sm font-semibold">{p.label}</p>
                    <p className="text-white/50 text-xs mt-0.5">{p.desc}</p>
                  </div>
                  <Check className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                </div>
              );
            })}
          </div>

          {/* ✅ 更新：价格卡片 */}
          <div className="space-y-2 mb-6">
            {[
              { duration: '1 個月', price: '$9.99', per: '/月', highlight: false },
              { duration: '3 個月', price: '$7.99', per: '/月', highlight: true, badge: '熱門' },
              { duration: '12 個月', price: '$4.99', per: '/月', highlight: false, badge: '最划算 62% OFF' },
            ].map(plan => (
              <div 
                key={plan.duration} 
                className={`relative rounded-2xl border p-4 text-center cursor-pointer transition-all ${
                  plan.highlight 
                    ? 'border-amber-500/60 bg-gradient-to-br from-amber-500/20 to-amber-500/5 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/30' 
                    : 'border-white/10 bg-white/3 hover:border-amber-500/40 hover:bg-amber-500/5'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                    plan.highlight 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' 
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {plan.badge}
                  </span>
                )}
                <p className="text-white/60 text-xs font-medium mb-1.5">{plan.duration}</p>
                <p className={`font-bold text-lg ${plan.highlight ? 'text-amber-400' : 'text-white'}`}>{plan.price}</p>
                <p className="text-white/40 text-xs">{plan.per}</p>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/30 text-base flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" /> 立即升級 VIP
          </button>
          
          <div className="flex items-center justify-center gap-1 text-white/30 text-xs mt-3">
            <span>隨時取消</span>
            <span>·</span>
            <span>自動續約</span>
            <span>·</span>
            <span>1-3 分鐘內開通</span>
          </div>
        </div>
      </div>
    </div>
  );
}
