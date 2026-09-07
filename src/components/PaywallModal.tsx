import React from 'react';
import { Crown, X, Zap, Globe, EyeOff, Rewind, Star, Lock, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';

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
  const { isVIP, entitlementStatus, entitlementError, trialEligibility } = useApp();
  const canOfferUpgrade = entitlementStatus === 'ready' && !isVIP;

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
              <p className="text-amber-300 text-xs font-medium">{canOfferUpgrade ? '解鎖頂級功能' : 'VIP 資格確認'}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {canOfferUpgrade ? (
            <>
              <div className="space-y-2.5 mb-7">
                {PERKS.map(p => {
                  const Icon = p.icon;
                  return (
                    <div key={p.label} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
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

              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-center">
                <p className="text-sm font-semibold text-amber-300">訂閱付款功能尚未啟用</p>
                <p className="mt-1 text-xs leading-5 text-white/50">此畫面不會建立付款、訂閱或 VIP 資格。30 天免費試用需由帳務後端持久化驗證後才能開放。</p>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-sm font-semibold text-white">
                {isVIP ? '目前帳號已具備 VIP 資格。' : entitlementStatus === 'loading' ? '正在確認 VIP 資格…' : '目前無法確認 VIP 資格。'}
              </p>
              {entitlementStatus === 'error' && <p className="mt-2 text-xs text-rose-300">{entitlementError ?? '請稍後再試。'}</p>}
              {trialEligibility.status === 'database-blocked' && <p className="mt-2 text-xs text-white/45">免費試用資格尚未具備可驗證的後端資料。</p>}
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-6 w-full bg-white/10 hover:bg-white/15 text-white font-bold py-4 rounded-2xl transition-all text-base"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
